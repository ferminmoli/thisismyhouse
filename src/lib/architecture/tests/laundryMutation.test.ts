import { describe, expect, it } from "vitest";
import {
  applyMutationPipeline,
  PLAN_MUTATIONS,
} from "../mutations";
import { runRecommendationEngine } from "../recommendationEngine";
import { scorePlanVariants } from "../planScorer";
import { generatePlanVariants } from "../variantGenerator";
import { validateGeneratedPlan } from "../generatedPlanValidator";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  runFullPipeline,
} from "./testHelpers";

const USER_PROMPT =
  "casa familiar compacta con buena luz en living Ambientes requeridos: 3 dormitorios, 1 baño, 1 cocina, living / comedor, patio o exterior. Superficie objetivo aproximada: 100 m². Distribución en una planta, forma general en L.";

describe("laundry mutations and ranking", () => {
  it("kitchen extension ranks #1 and is recommended for family-home fixture", async () => {
    const pipeline = await runFullPipeline(USER_PROMPT);
    expect(pipeline.recommendation?.bestVariantId).toBe(
      "add_laundry_as_kitchen_extension",
    );
    expect(pipeline.recommendation?.recommendationStatus).toBe("final");

    const laundry = pipeline.ranking.find(
      (r) => r.mutationType === "add_laundry_as_kitchen_extension",
    )!;
    const patio = pipeline.ranking.find(
      (r) => r.mutationType === "expand_patio",
    )!;
    expect(laundry.rank).toBe(1);
    expect(laundry.totalScore).toBeGreaterThan(patio.totalScore);
  });

  it("add_laundry_as_kitchen_extension scores higher than add_compact_laundry", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
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

    const extension = scored.scoredVariants.find(
      (v) => v.mutationType === "add_laundry_as_kitchen_extension",
    )!;
    const compact = scored.scoredVariants.find(
      (v) => v.mutationType === "add_compact_laundry",
    )!;

    expect(extension.status).toBe("ok");
    expect(compact.status).toBe("ok");
    expect(extension.score.total).toBeGreaterThan(compact.score.total);
  });

  it("kitchen extension laundry avoids ventilation and wet-core warnings", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find(
      (m) => m.type === "add_laundry_as_kitchen_extension",
    )!;

    const result = applyMutationPipeline(base, topology, mutation, program);
    expect(result.status).toBe("ok");

    const codes = result.validation.architecturalIssues.map((i) => i.code);
    expect(codes).not.toContain("ROOM_WITHOUT_NATURAL_VENTILATION");
    expect(codes).not.toContain("WET_ROOMS_TOO_FAR");
    expect(
      result.plan.windows.some((w) => w.zoneId === "LAVADERO"),
    ).toBe(true);
  });

  it("compact laundry still triggers wet-room spread or missing vent", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find(
      (m) => m.type === "add_compact_laundry",
    )!;
    const result = applyMutationPipeline(base, topology, mutation, program);
    const codes = result.validation.architecturalIssues.map((i) => i.code);
    const hasWetOrVent =
      codes.includes("WET_ROOMS_TOO_FAR") ||
      codes.includes("ROOM_WITHOUT_NATURAL_VENTILATION");
    expect(hasWetOrVent).toBe(true);
  });

  it("expand_patio without laundry is not recommended over complete laundry variant", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram(USER_PROMPT);
    const topology = await createMockTopology(program);
    const variants = generatePlanVariants({
      basePlan: base,
      topologyGraph: topology,
      program,
    });

    const engine = runRecommendationEngine({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants,
      userPrompt: USER_PROMPT,
    });

    const patio = engine.scoredVariants.find(
      (v) => v.mutationType === "expand_patio",
    )!;
    const laundry = engine.scoredVariants.find(
      (v) => v.mutationType === "add_laundry_as_kitchen_extension",
    )!;

    expect(laundry.score.total).toBeGreaterThan(patio.score.total);
    expect(engine.recommendation?.bestVariantId).toBe(
      "add_laundry_as_kitchen_extension",
    );
    expect(
      patio.validation.architecturalIssues.some(
        (i) => i.code === "MISSING_LAUNDRY_FAMILY_HOME",
      ),
    ).toBe(true);
  });

  it("kitchen extension clears missing laundry warning", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find(
      (m) => m.type === "add_laundry_as_kitchen_extension",
    )!;
    const result = applyMutationPipeline(base, topology, mutation, program);
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
