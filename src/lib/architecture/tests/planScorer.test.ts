import { describe, expect, it } from "vitest";
import {
  isVariantScorable,
  scorePlanVariants,
} from "../planScorer";
import { generatePlanVariants } from "../variantGenerator";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  runFullPipeline,
  TEST_PROMPT,
} from "./testHelpers";

function scoreBreakdownKeys() {
  return [
    "total",
    "adjacencyScore",
    "daylightScore",
    "socialOutdoorScore",
    "privateWingScore",
    "kitchenIntegrationScore",
    "areaEfficiencyScore",
    "mutationIntentScore",
    "penalties",
    "reasons",
  ] as const;
}

describe("planScorer", () => {
  it("scores only eligible variants and ignores compact_private_wing", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });

    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    expect(result.scoredVariants.length).toBeGreaterThanOrEqual(8);
    expect(result.stageOutput.ignoredVariants.some(
      (i) => i.mutationType === "compact_private_wing",
    )).toBe(true);
    expect(
      result.scoredVariants.some((v) => v.mutationType === "compact_private_wing"),
    ).toBe(false);
  });

  it("recommendedVariant matches rank 1 and maximum total score", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });

    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    expect(result.recommendedVariant?.rank).toBe(1);
    const max = Math.max(...result.scoredVariants.map((v) => v.score.total));
    expect(result.recommendedVariant?.score.total).toBe(max);
    for (let i = 1; i < result.scoredVariants.length; i++) {
      expect(result.scoredVariants[i - 1]!.score.total).toBeGreaterThanOrEqual(
        result.scoredVariants[i]!.score.total,
      );
      expect(result.scoredVariants[i]!.rank).toBe(i + 1);
    }
  });

  it("produces top 3 when at least 3 eligible exist", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });

    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    expect(result.topVariants).toHaveLength(3);
    expect(result.recommendedVariant).not.toBeNull();
    expect(result.recommendation?.bestVariantLabel).toBe(
      result.topVariants[0]!.label,
    );
  });

  it("every scored variant has full breakdown", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });
    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    for (const v of result.scoredVariants) {
      for (const key of scoreBreakdownKeys()) {
        expect(v.score).toHaveProperty(key);
      }
      expect(v.score.reasons.length).toBeGreaterThan(0);
      expect(v.score.total).toBeGreaterThanOrEqual(0);
      expect(v.score.total).toBeLessThanOrEqual(100);
    }
  });

  it("ranking is deterministic across two runs", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });
    const params = {
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    };

    const a = scorePlanVariants(params);
    const b = scorePlanVariants(params);

    expect(a.topVariants.map((v) => v.mutationType)).toEqual(
      b.topVariants.map((v) => v.mutationType),
    );
    expect(a.topVariants.map((v) => v.score.total)).toEqual(
      b.topVariants.map((v) => v.score.total),
    );
  });

  it("clean eligible variants have zero penalties", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });
    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    for (const v of result.scoredVariants) {
      expect(v.score.penalties.warnings).toBe(0);
      expect(v.score.penalties.errors).toBe(0);
      expect(v.score.penalties.invalidAdjacency).toBe(0);
      expect(v.score.penalties.skipped).toBe(0);
    }
  });

  it("applies user priority boosts to intent-related variants", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const program = await createMockProgram();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });
    const result = scorePlanVariants({
      program,
      topologyGraph: topology,
      referencePlan: basePlan,
      variants,
    });

    const base = result.scoredVariants.find((v) => v.mutationType === "base")!;
    const kitchen = result.scoredVariants.find(
      (v) => v.mutationType === "integrate_kitchen",
    )!;
    const patio = result.scoredVariants.find(
      (v) => v.mutationType === "expand_patio",
    )!;
    const gallery = result.scoredVariants.find(
      (v) => v.mutationType === "gallery_patio",
    );
    const social = result.scoredVariants.find(
      (v) => v.mutationType === "expand_social",
    )!;
    const master = result.scoredVariants.find(
      (v) => v.mutationType === "larger_master_bedroom",
    )!;

    expect(kitchen.score.kitchenIntegrationScore).toBeGreaterThanOrEqual(
      base.score.kitchenIntegrationScore,
    );
    if (gallery) {
      expect(
        Math.max(patio.score.socialOutdoorScore, gallery.score.socialOutdoorScore),
      ).toBeGreaterThanOrEqual(base.score.socialOutdoorScore);
    } else {
      expect(patio.score.socialOutdoorScore).toBeGreaterThanOrEqual(
        base.score.socialOutdoorScore,
      );
    }
    expect(
      social.score.socialOutdoorScore + social.score.mutationIntentScore,
    ).toBeGreaterThanOrEqual(
      base.score.socialOutdoorScore + base.score.mutationIntentScore,
    );

    const masterRank = master.rank ?? 99;
    const patioRank = Math.min(
      patio.rank ?? 99,
      gallery?.rank ?? 99,
    );
    expect(masterRank).toBeGreaterThan(patioRank);
  });

  it("base variant has effect.changed false and is eligible", async () => {
    const basePlan = await createGeneratedPlan();
    const topology = await createMockTopology();
    const variants = generatePlanVariants({ basePlan, topologyGraph: topology });
    const base = variants.find((v) => v.mutationType === "base")!;

    expect(base.status).toBe("ok");
    expect(base.eligibleForRanking).toBe(true);
    expect(base.effect.changed).toBe(false);
    expect(isVariantScorable(base)).toBe(true);
  });
});

describe("planScorer pipeline integration", () => {
  it("includes ranking with 8 scored and recommendation", async () => {
    const pipeline = await runFullPipeline(TEST_PROMPT, { debug: true });

    const stage = pipeline.debug!.stages.find((s) => s.id === "plan_scorer");
    expect(stage).toBeDefined();
    expect(stage!.status).toBe("ok");

    expect(pipeline.ranking.length).toBeGreaterThanOrEqual(8);
    expect(pipeline.recommendation).not.toBeNull();
    expect(pipeline.recommendation!.why.length).toBeGreaterThan(0);

    const output = stage!.output as {
      scoredCount: number;
      topCount: number;
      ignoredVariants: { mutationType: string }[];
    };
    expect(output.scoredCount).toBeGreaterThanOrEqual(8);
    expect(output.topCount).toBe(3);
    expect(
      output.ignoredVariants.some((i) => i.mutationType === "compact_private_wing"),
    ).toBe(true);
  });
});
