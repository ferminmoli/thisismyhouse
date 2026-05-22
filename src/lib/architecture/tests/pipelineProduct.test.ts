import { describe, expect, it } from "vitest";
import { evaluateZoneDimensions } from "../dimensionalRules";
import { buildAreaEstimate } from "../planMetadata";
import { applyMutationPipeline, PLAN_MUTATIONS } from "../mutations";
import { runRecommendationEngine } from "../recommendationEngine";
import { scorePlanVariants } from "../planScorer";
import { generatePlanVariants } from "../variantGenerator";
import { validateGeneratedPlan } from "../generatedPlanValidator";
import { hasSemiOutdoorGalleryZone } from "../planMetadata";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  getPlanFromPipeline,
  runFullPipeline,
  TEST_PROMPT,
} from "./testHelpers";

const USER_PROMPT =
  "casa familiar compacta con buena luz en living Ambientes requeridos: 3 dormitorios, 1 baño, 1 cocina, living / comedor, patio o exterior. Superficie objetivo aproximada: 100 m². Distribución en una planta, forma general en L.";

describe("score-based ranking", () => {
  it("recommends the highest totalScore variant even when brief favors patio/light", async () => {
    const program = await createMockProgram(USER_PROMPT);
    const base = await createGeneratedPlan();
    const topology = await createMockTopology(program);
    const variants = generatePlanVariants({
      basePlan: base,
      topologyGraph: topology,
      program,
    });

    const scored = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants,
    });

    const kitchen = scored.scoredVariants.find(
      (v) => v.mutationType === "integrate_kitchen",
    )!;
    const patio = scored.scoredVariants.find(
      (v) => v.mutationType === "expand_patio",
    )!;

    expect(kitchen.score.total - patio.score.total).toBeLessThanOrEqual(2);

    const engine = runRecommendationEngine({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants,
      userPrompt: USER_PROMPT,
    });

    const top = engine.scoredVariants[0]!;
    expect(engine.recommendation?.bestVariantId).toBe(top.mutationType);
    expect(engine.recommendation?.bestVariantId).toBe(
      engine.recommendedVariant!.mutationType,
    );
    expect(top.score.total).toBeGreaterThanOrEqual(patio.score.total);
    expect(top.score.total).toBeGreaterThanOrEqual(kitchen.score.total);
    const sel = engine.recommendation!.selectionMethod;
    expect(sel.finalRecommendedVariant).toBe(top.mutationType);
    expect(sel.rawTopVariant).toBe(top.mutationType);
    expect(engine.recommendation?.narrativeSummary).toMatch(/^Recomendamos/i);
  });
});

describe("area model", () => {
  it("scales covered near target and patio near ideal outdoor m²", async () => {
    const program = await createMockProgram();
    const plan = await createGeneratedPlan();
    const est = buildAreaEstimate(plan, program);

    expect(est.targetCoveredAreaM2).toBe(100);
    expect(est.estimatedCoveredAreaM2).toBeGreaterThanOrEqual(95);
    expect(est.estimatedCoveredAreaM2).toBeLessThanOrEqual(105);
    expect(est.targetOutdoorAreaM2).toBe(10);
    expect(est.estimatedOutdoorAreaM2).toBeGreaterThanOrEqual(8);
    expect(est.estimatedOutdoorAreaM2).toBeLessThanOrEqual(14);
    expect(est.zoneAreaEstimates.some((z) => z.roomId === "PATIO")).toBe(true);
    expect(
      est.zoneAreaEstimates.find((z) => z.roomId === "PATIO")?.areaKind,
    ).toBe("outdoor");
  });
});

describe("normalized pipeline response", () => {
  it("deduplicates plans into plansById and references planId on variants", async () => {
    const pipeline = await runFullPipeline(TEST_PROMPT);
    const planIds = Object.keys(pipeline.plansById);
    expect(planIds.length).toBeGreaterThanOrEqual(7);

    for (const v of pipeline.variants) {
      expect(v.planId).toBeDefined();
      expect(pipeline.plansById[v.planId]).toBeDefined();
      expect("plan" in v).toBe(false);
    }

    expect(pipeline.recommendation?.bestPlanId).toBeDefined();
    expect(
      pipeline.plansById[pipeline.recommendation!.bestPlanId],
    ).toBeDefined();
  });
});

describe("gallery dimensional rules", () => {
  it("does not penalize gallery transition aspect like a bedroom", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "gallery_patio")!;
    const result = applyMutationPipeline(base, topology, mutation, program);
    const gallery = result.plan.zones.find((z) => z.sourceRoomId === "GALERIA")!;
    const dim = evaluateZoneDimensions(gallery);
    expect(dim.rule.ruleSet).toBe("gallery_transition");
    expect(dim.rule.aspectRatioPenalty).toBe(false);
    expect(dim.aspectExceeded).toBe(false);
  });

  it("gallery chain satisfies social-outdoor path", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "gallery_patio")!;
    const result = applyMutationPipeline(base, topology, mutation, program);
    expect(hasSemiOutdoorGalleryZone(result.plan)).toBe(true);
    const val = result.validation;
    const socialPatio = val.hardAdjacencyChecks.find(
      (c) =>
        (c.from === "SALA_COMEDOR" && c.to === "PATIO") ||
        (c.from === "PATIO" && c.to === "SALA_COMEDOR"),
    );
    expect(socialPatio?.satisfied).toBe(true);
  });
});

describe("confidence levels", () => {
  it("uses medium_low when hard validation passes but site is unknown", async () => {
    const pipeline = await runFullPipeline(USER_PROMPT);
    expect(pipeline.generatedPlanValidation.ok).toBe(true);
    expect(pipeline.recommendation?.confidence.overall).toBe("medium_low");
  });
});

describe("compact laundry mutation", () => {
  it("creates LAVADERO and clears missing laundry warning on variant", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find(
      (m) => m.type === "add_compact_laundry",
    )!;

    const baseVal = validateGeneratedPlan(base, {
      program,
      topologyGraph: topology,
    });
    expect(
      baseVal.architecturalIssues.some(
        (i) => i.code === "MISSING_LAUNDRY_FAMILY_HOME",
      ),
    ).toBe(true);

    const result = applyMutationPipeline(base, topology, mutation, program);
    expect(result.status).toBe("ok");
    expect(
      result.plan.zones.some((z) => z.sourceRoomId === "LAVADERO"),
    ).toBe(true);
    expect(result.plan.zones.find((z) => z.sourceRoomId === "LAVADERO")?.type).toBe(
      "service",
    );

    const val = validateGeneratedPlan(result.plan, {
      program,
      topologyGraph: topology,
    });
    expect(
      val.architecturalIssues.some(
        (i) => i.code === "MISSING_LAUNDRY_FAMILY_HOME",
      ),
    ).toBe(false);
  });
});
