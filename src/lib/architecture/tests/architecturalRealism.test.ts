import { describe, expect, it } from "vitest";
import { validateArchitecturalDesign } from "../architecturalValidation";
import { buildAreaEstimate, enrichPlanSpatialMetadata } from "../planMetadata";
import {
  priorityTieBoost,
  runRecommendationEngine,
} from "../recommendationEngine";
import { scorePlanVariants } from "../planScorer";
import { generatePlanVariants } from "../variantGenerator";
import { validateGeneratedPlan } from "../generatedPlanValidator";
import { hasSemiOutdoorGalleryZone } from "../planMetadata";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  runFullPipeline,
  TEST_PROMPT,
} from "./testHelpers";

const USER_PROMPT =
  "casa familiar compacta con buena luz en living Ambientes requeridos: 3 dormitorios, 1 baño, 1 cocina, living / comedor, patio o exterior. Superficie objetivo aproximada: 100 m². Distribución en una planta, forma general en L.";

describe("coordinate and area layer", () => {
  it("attaches coordinateSystem and areaEstimate without implying canvas units are meters", async () => {
    const program = await createMockProgram();
    const plan = await createGeneratedPlan();
    const enriched = enrichPlanSpatialMetadata(plan, program);

    expect(enriched.metadata.coordinateSystem?.type).toBe("normalized_canvas");
    expect(enriched.metadata.coordinateSystem?.realWorldUnits).toBe(false);
    expect(enriched.metadata.areaEstimate?.targetCoveredAreaM2).toBe(100);
    expect(enriched.metadata.areaEstimate?.estimatedOutdoorAreaM2).toBeGreaterThan(0);
    expect(enriched.metadata.areaEstimate?.confidence).toBeDefined();
  });

  it("does not count patio as covered area", async () => {
    const program = await createMockProgram();
    const plan = await createGeneratedPlan();
    const est = buildAreaEstimate(plan, program);
    const patio = plan.zones.find((z) => z.sourceRoomId === "PATIO")!;
    const patioUnits = patio.width * patio.height;
    expect(est.outdoorCanvasUnits).toBe(patioUnits);
    expect(est.coveredCanvasUnits).toBeLessThan(
      plan.zones.reduce((s, z) => s + z.width * z.height, 0),
    );
  });
});

describe("architectural validation issues", () => {
  it("warns missing laundry for family house", async () => {
    const program = await createMockProgram();
    const plan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const val = validateGeneratedPlan(plan, { program, topologyGraph: topology });
    const issue = val.architecturalIssues.find(
      (i) => i.code === "MISSING_LAUNDRY_FAMILY_HOME",
    );
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
    expect(issue!.affectedRoomIds).toContain("COCINA");
  });

  it("warns high bedroom aspect ratio when zone is elongated", async () => {
    const program = await createMockProgram();
    const plan = await createGeneratedPlan();
    const dorm2 = plan.zones.find((z) => z.sourceRoomId === "DORMITORIO_2");
    if (dorm2) {
      dorm2.width = 30;
      dorm2.height = 8;
    }
    const topology = await createMockTopology();
    const val = validateGeneratedPlan(plan, { program, topologyGraph: topology });
    expect(
      val.architecturalIssues.some((i) => i.code === "BEDROOM_ASPECT_RATIO_HIGH"),
    ).toBe(true);
  });

  it("flags unknown orientation when daylight is priority", async () => {
    const program = await createMockProgram();
    expect(program.site.orientation).toBe("unknown");
    const plan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const val = validateGeneratedPlan(plan, { program, topologyGraph: topology });
    expect(
      val.architecturalIssues.some((i) => i.code === "DAYLIGHT_ORIENTATION_UNKNOWN"),
    ).toBe(true);
  });
});

describe("gallery_patio mutation", () => {
  it("uses semi_outdoor GALERIA zone not furniture", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology();
    const variants = generatePlanVariants({
      basePlan: base,
      topologyGraph: topology,
      program,
    });
    const gallery = variants.find((v) => v.mutationType === "gallery_patio")!;
    expect(hasSemiOutdoorGalleryZone(gallery.plan)).toBe(true);
    expect(
      gallery.plan.furniture.some((f) => f.id.includes("gallery_patio_hint")),
    ).toBe(false);
    expect(gallery.plan.zones.some((z) => z.type === "semi_outdoor")).toBe(true);
  });
});

describe("scoring and recommendation", () => {
  it("tie-breaker priority favors patio over kitchen when scores tie", async () => {
    const program = await createMockProgram();
    const pri = program.priorities.join(" ").toLowerCase();
    const patioBoost = priorityTieBoost("expand_patio", pri);
    const kitchenBoost = priorityTieBoost("integrate_kitchen", pri);
    expect(patioBoost).toBeGreaterThan(kitchenBoost);
  });

  it("integrate_kitchen scores at least base on kitchenIntegration", async () => {
    const program = await createMockProgram();
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const variants = generatePlanVariants({
      basePlan: base,
      topologyGraph: topology,
      program,
    });
    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants,
    });
    const kitchen = result.scoredVariants.find(
      (v) => v.mutationType === "integrate_kitchen",
    )!;
    const baseV = result.scoredVariants.find((v) => v.mutationType === "base")!;
    expect(kitchen.score.kitchenIntegrationScore).toBeGreaterThanOrEqual(
      baseV.score.kitchenIntegrationScore,
    );
  });
});

describe("full pipeline realism", () => {
  it("l_shape template still validates with enriched recommendation", async () => {
    const pipeline = await runFullPipeline(USER_PROMPT, { debug: true });
    const base = pipeline.plansById[pipeline.generatedPlanId!]!;

    expect(base.templateId).toBe("l_shape_patio");
    expect(pipeline.generatedPlanValidation.ok).toBe(true);
    expect(base.metadata.coordinateSystem).toBeDefined();
    expect(pipeline.recommendation?.confidence.overall).toBeDefined();
    expect(pipeline.recommendation?.professionalReview.required).toBe(true);
    expect(pipeline.recommendation?.narrativeSummary.length).toBeGreaterThan(20);
    expect(
      pipeline.debug!.stages.some((s) => s.id === "recommendation_engine"),
    ).toBe(true);
  });
});
