import { describe, expect, it } from "vitest";
import { runRecommendationEngine } from "../recommendationEngine";
import {
  assertRankingInvariants,
  scorePlanVariants,
} from "../planScorer";
import { generatePlanVariants } from "../variantGenerator";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  runFullPipeline,
} from "./testHelpers";

const USER_PROMPT =
  "casa familiar compacta con buena luz en living Ambientes requeridos: 3 dormitorios, 1 baño, 1 cocina, living / comedor, patio o exterior. Superficie objetivo aproximada: 100 m². Distribución en una planta, forma general en L.";

function assertScoreOrderedRanking(
  ranked: { rank?: number; score: { total: number } }[],
): void {
  expect(ranked.length).toBeGreaterThan(0);
  for (let i = 0; i < ranked.length; i++) {
    expect(ranked[i]!.rank).toBe(i + 1);
    if (i > 0) {
      expect(ranked[i - 1]!.score.total).toBeGreaterThanOrEqual(
        ranked[i]!.score.total,
      );
    }
  }
  const max = Math.max(...ranked.map((v) => v.score.total));
  expect(ranked[0]!.score.total).toBe(max);
}

describe("ranking invariants", () => {
  it("recommendedVariant has the maximum score among ranked variants", async () => {
    const program = await createMockProgram(USER_PROMPT);
    const base = await createGeneratedPlan();
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

    assertScoreOrderedRanking(engine.scoredVariants);
    expect(engine.recommendedVariant).not.toBeNull();
    expect(engine.recommendedVariant!.score.total).toBe(
      engine.scoredVariants[0]!.score.total,
    );
    expect(engine.recommendation?.bestVariantId).toBe(
      engine.recommendedVariant!.mutationType,
    );
    for (const v of engine.scoredVariants) {
      expect(v.rank!).toBeLessThanOrEqual(engine.scoredVariants.length);
      if (v.score.total > engine.recommendedVariant!.score.total) {
        expect(v.rank).toBeGreaterThan(engine.recommendedVariant!.rank!);
      }
    }
  });

  it("family-home fixture: laundry extension ranks #1 and is recommended", async () => {
    const pipeline = await runFullPipeline(USER_PROMPT);

    assertScoreOrderedRanking(
      pipeline.ranking.map((r) => ({
        rank: r.rank,
        score: { total: r.totalScore },
      })),
    );

    const laundry = pipeline.ranking.find(
      (r) => r.mutationType === "add_laundry_as_kitchen_extension",
    );
    const patio = pipeline.ranking.find((r) => r.mutationType === "expand_patio");

    expect(laundry).toBeDefined();
    expect(laundry!.rank).toBe(1);
    expect(laundry!.totalScore).toBeGreaterThan(patio!.totalScore);

    expect(pipeline.recommendation?.bestVariantId).toBe(
      "add_laundry_as_kitchen_extension",
    );
    expect(pipeline.recommendation?.recommendationStatus).toBe("final");
    expect(pipeline.recommendation?.recommendedNextStep).toBeUndefined();
  });

  it("topVariants are the first three ranks by score", async () => {
    const program = await createMockProgram(USER_PROMPT);
    const base = await createGeneratedPlan();
    const topology = await createMockTopology(program);
    const scored = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants: generatePlanVariants({
        basePlan: base,
        topologyGraph: topology,
        program,
      }),
    });

    expect(scored.topVariants).toHaveLength(3);
    expect(scored.topVariants.map((v) => v.rank)).toEqual([1, 2, 3]);
    assertScoreOrderedRanking(scored.scoredVariants);
    assertRankingInvariants(
      scored.scoredVariants,
      scored.topVariants,
      scored.recommendedVariant,
    );
    expect(scored.recommendedVariant).toBe(scored.scoredVariants[0]);
    expect(scored.topVariants).toEqual(scored.scoredVariants.slice(0, 3));
  });
});
