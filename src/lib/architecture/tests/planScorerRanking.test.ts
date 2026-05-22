import { describe, expect, it } from "vitest";
import type { GeneratedPlan } from "../generatedPlan";
import type { GeneratedPlanValidation } from "../generatedPlan";
import {
  assertRankingInvariants,
  buildFinalRankedVariants,
  computeFinalTotalScore,
  deriveScorerRankingOutputs,
  type PlanScoreBreakdown,
  type PlanScorePenalties,
  type ScoredPlanVariant,
} from "../planScorer";
import type { MutationType } from "../mutations";

const ZERO_PENALTIES: PlanScorePenalties = {
  warnings: 0,
  errors: 0,
  skipped: 0,
  invalidAdjacency: 0,
  aspectRatio: 0,
  excessiveMutation: 0,
  missingLaundry: 0,
  poorBedroomProportion: 0,
  unknownOrientationDaylight: 0,
  patioAsCovered: 0,
  galleryAsFurniture: 0,
  wetRoomsFar: 0,
  noVentilation: 0,
  laundryNoVentilation: 0,
};

function baseBreakdown(
  overrides: Partial<PlanScoreBreakdown> & { total: number },
): PlanScoreBreakdown {
  return {
    adjacencyScore: 18,
    daylightScore: 12,
    socialOutdoorScore: 20,
    privateWingScore: 14,
    kitchenIntegrationScore: 10,
    areaEfficiencyScore: 8,
    wetCoreEfficiencyScore: 8,
    ventilationScore: 6,
    dimensionalQualityScore: 6,
    orientationConfidenceScore: 4,
    mutationIntentScore: 6,
    penalties: { ...ZERO_PENALTIES },
    reasons: ["fixture"],
    ...overrides,
  };
}

const MINIMAL_PLAN = {
  id: "p1",
  templateId: "t",
  zones: [],
  doors: [],
  windows: [],
  furniture: [],
  metadata: { notes: [] },
} as GeneratedPlan;

const OK_VALIDATION: GeneratedPlanValidation = {
  ok: true,
  errors: [],
  warnings: [],
  infos: [],
  architecturalIssues: [],
  hardAdjacencyChecks: [],
  doorContactChecks: [],
};

function scoredFixture(
  mutationType: MutationType,
  score: PlanScoreBreakdown,
  opts?: { eligible?: boolean; status?: ScoredPlanVariant["status"] },
): ScoredPlanVariant {
  return {
    mutationType,
    label: mutationType,
    description: "",
    plan: MINIMAL_PLAN,
    validation: OK_VALIDATION,
    status: opts?.status ?? "ok",
    eligibleForRanking: opts?.eligible ?? true,
    messages: [],
    effect: { changedZones: [], changedDoors: [], changedWindows: [] },
    score,
  };
}

describe("planScorer ranking", () => {
  it("computeFinalTotalScore applies penalties once (late adjustment)", () => {
    const subtotalPatio = 94;
    const subtotalLaundry = 90;
    const patioTotal = computeFinalTotalScore(subtotalPatio, {
      ...ZERO_PENALTIES,
      missingLaundry: 6,
    });
    const laundryTotal = computeFinalTotalScore(subtotalLaundry, ZERO_PENALTIES);

    expect(subtotalPatio).toBeGreaterThan(subtotalLaundry);
    expect(patioTotal).toBeLessThan(laundryTotal);

    const patio = scoredFixture(
      "expand_patio",
      baseBreakdown({
        total: patioTotal,
        socialOutdoorScore: 42,
        wetCoreEfficiencyScore: 4,
      }),
    );
    const laundry = scoredFixture(
      "add_laundry_as_kitchen_extension",
      baseBreakdown({
        total: laundryTotal,
        socialOutdoorScore: 28,
        wetCoreEfficiencyScore: 14,
      }),
    );

    const ranked = buildFinalRankedVariants([patio, laundry]);
    expect(ranked[0]!.mutationType).toBe("add_laundry_as_kitchen_extension");
    expect(ranked[0]!.score.total).toBeGreaterThan(ranked[1]!.score.total);
  });

  it("deriveScorerRankingOutputs ties recommended, top, and scored list", () => {
    const variants = [
      scoredFixture("base", baseBreakdown({ total: 70 })),
      scoredFixture("expand_patio", baseBreakdown({ total: 82 })),
      scoredFixture(
        "add_laundry_as_kitchen_extension",
        baseBreakdown({ total: 90 }),
      ),
      scoredFixture("mirror_horizontal", baseBreakdown({ total: 75 })),
      scoredFixture("gallery_patio", baseBreakdown({ total: 68 })),
    ];

    const { scoredVariants, topVariants, recommendedVariant } =
      deriveScorerRankingOutputs(variants, 3);

    assertRankingInvariants(scoredVariants, topVariants, recommendedVariant, 3);
    expect(recommendedVariant).toBe(scoredVariants[0]);
    expect(topVariants).toEqual(scoredVariants.slice(0, 3));
    expect(topVariants.map((v) => v.rank)).toEqual([1, 2, 3]);
  });

  it("excludes skipped and ineligible variants from topVariants", () => {
    const ok = scoredFixture("base", baseBreakdown({ total: 80 }));
    const skipped = scoredFixture(
      "expand_patio",
      baseBreakdown({ total: 99 }),
      { status: "skipped", eligible: false },
    );
    const ineligible = scoredFixture(
      "gallery_patio",
      baseBreakdown({ total: 95 }),
      { eligible: false },
    );

    const { scoredVariants, topVariants } = deriveScorerRankingOutputs(
      [skipped, ineligible, ok],
      3,
    );

    expect(scoredVariants).toHaveLength(1);
    expect(topVariants).toHaveLength(1);
    expect(topVariants[0]!.mutationType).toBe("base");
    expect(topVariants.every((v) => v.status === "ok" && v.eligibleForRanking)).toBe(
      true,
    );
  });

  it("assigns rank on ranked copies; input objects keep prior rank fields", () => {
    const low = scoredFixture("base", baseBreakdown({ total: 60 }));
    const high = scoredFixture("expand_patio", baseBreakdown({ total: 88 }));
    low.rank = 99;
    high.rank = 1;

    const ranked = buildFinalRankedVariants([low, high]);
    expect(ranked[0]!.mutationType).toBe("expand_patio");
    expect(ranked[0]!.rank).toBe(1);
    expect(ranked[1]!.rank).toBe(2);
    expect(low.rank).toBe(99);
    expect(high.rank).toBe(1);
  });
});
