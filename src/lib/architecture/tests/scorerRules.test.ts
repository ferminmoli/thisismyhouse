import { describe, expect, it } from "vitest";
import { applyMutationPipeline, PLAN_MUTATIONS } from "../mutations";
import { scorePlanVariants } from "../planScorer";
import { NEAR_TIE_THRESHOLD } from "../prioritySelection";
import { generatePlanVariants } from "../variantGenerator";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
} from "./testHelpers";

const FAMILY_PROMPT =
  "casa familiar compacta con buena luz en living Ambientes requeridos: 3 dormitorios, 1 baño, 1 cocina, living / comedor, patio o exterior. Superficie objetivo aproximada: 100 m². Distribución en una planta, forma general en L.";

describe("scorer rules", () => {
  it("add_laundry_as_kitchen_extension beats expand_patio for family home", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram(FAMILY_PROMPT);
    const topology = await createMockTopology(program);
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

    const laundry = result.scoredVariants.find(
      (v) => v.mutationType === "add_laundry_as_kitchen_extension",
    )!;
    const patio = result.scoredVariants.find(
      (v) => v.mutationType === "expand_patio",
    )!;

    expect(laundry.rank).toBe(1);
    expect(laundry.score.total).toBeGreaterThan(patio.score.total);
    expect(result.recommendedVariant?.mutationType).toBe(
      "add_laundry_as_kitchen_extension",
    );
    expect(result.topVariants[0]!.mutationType).toBe(
      result.recommendedVariant!.mutationType,
    );
  });

  it("add_compact_laundry penalized vs kitchen extension when no ventilation", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
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

    const extension = result.scoredVariants.find(
      (v) => v.mutationType === "add_laundry_as_kitchen_extension",
    )!;
    const compact = result.scoredVariants.find(
      (v) => v.mutationType === "add_compact_laundry",
    );

    if (compact) {
      expect(extension.score.total).toBeGreaterThan(compact.score.total);
      expect(
        compact.score.penalties.laundryNoVentilation +
          compact.score.penalties.noVentilation,
      ).toBeGreaterThanOrEqual(extension.score.penalties.laundryNoVentilation);
    }
  });

  it("mirror_horizontal ranked below leader when wet core is distant", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram(FAMILY_PROMPT);
    const topology = await createMockTopology(program);
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "mirror_horizontal")!;
    const mirrored = applyMutationPipeline(base, topology, mutation, program);

    if (
      mirrored.validation.architecturalIssues.some(
        (i) => i.code === "WET_ROOMS_TOO_FAR" || i.code === "WET_CORE_TOO_DISTANT",
      )
    ) {
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
      const mirror = result.scoredVariants.find(
        (v) => v.mutationType === "mirror_horizontal",
      );
      const leader = result.scoredVariants[0]!;
      if (mirror) {
        expect(mirror.score.total).toBeLessThanOrEqual(leader.score.total);
        expect(mirror.rank!).toBeGreaterThan(1);
      }
    }
  });

  it("compact_private_wing not in scoredVariants", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
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

    expect(
      result.scoredVariants.some((v) => v.mutationType === "compact_private_wing"),
    ).toBe(false);
    expect(
      result.stageOutput.ignoredVariants.some(
        (i) => i.mutationType === "compact_private_wing",
      ),
    ).toBe(true);
  });

  it("topVariants sorted descending; near-tie flag consistent", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram(FAMILY_PROMPT);
    const topology = await createMockTopology(program);
    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants: generatePlanVariants({
        basePlan: base,
        topologyGraph: topology,
        program,
      }),
    });

    for (let i = 1; i < result.topVariants.length; i++) {
      expect(result.topVariants[i - 1]!.score.total).toBeGreaterThanOrEqual(
        result.topVariants[i]!.score.total,
      );
    }

    const top = result.scoredVariants[0]!.score.total;
    const nearTieCount = result.scoredVariants.filter(
      (v) => top - v.score.total <= NEAR_TIE_THRESHOLD,
    ).length;
    if (nearTieCount > 1) {
      expect(top - result.scoredVariants[1]!.score.total).toBeLessThanOrEqual(
        NEAR_TIE_THRESHOLD,
      );
    }
  });
});
