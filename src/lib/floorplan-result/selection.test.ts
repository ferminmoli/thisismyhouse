import { describe, expect, it } from "vitest";
import {
  getSelectableVariants,
  resolveInitialVariantId,
  resolveRecommendedVariant,
  resolveSelectedVariant,
  stableVariantId,
} from "./selection";
import { MOCK_PUBLIC_RESULT } from "./fixtures";

describe("floorplan-result selection", () => {
  it("resolveInitialVariantId always returns recommended id", () => {
    expect(resolveInitialVariantId(MOCK_PUBLIC_RESULT)).toBe(
      MOCK_PUBLIC_RESULT.recommendedVariant.id,
    );
  });

  it("resolveSelectedVariant falls back to recommended, not first top variant", () => {
    const wrongId = "nonexistent_variant";
    const selected = resolveSelectedVariant(MOCK_PUBLIC_RESULT, wrongId);
    expect(selected.id).toBe(MOCK_PUBLIC_RESULT.recommendedVariant.id);
  });

  it("getSelectableVariants returns top 3 including recommended", () => {
    const variants = getSelectableVariants(MOCK_PUBLIC_RESULT);
    expect(variants).toHaveLength(3);
    expect(variants.some((v) => v.id === MOCK_PUBLIC_RESULT.recommendedVariant.id)).toBe(
      true,
    );
  });

  it("getSelectableVariants puts recommended variant first", () => {
    const shuffled = {
      ...MOCK_PUBLIC_RESULT,
      topVariants: [...MOCK_PUBLIC_RESULT.topVariants].reverse(),
    };
    const variants = getSelectableVariants(shuffled);
    expect(variants[0]!.id).toBe(
      stableVariantId(shuffled.recommendedVariant),
    );
  });

  it("resolveRecommendedVariant falls back to topVariants[0]", () => {
    const patio = MOCK_PUBLIC_RESULT.topVariants.find(
      (v) => v.id === "expand_patio",
    )!;
    const result = {
      ...MOCK_PUBLIC_RESULT,
      recommendedVariant: {
        ...MOCK_PUBLIC_RESULT.recommendedVariant,
        plan: { ...MOCK_PUBLIC_RESULT.recommendedVariant.plan, zones: [] },
      },
      topVariants: [patio, ...MOCK_PUBLIC_RESULT.topVariants],
    };
    const rec = resolveRecommendedVariant(result);
    expect(rec?.id).toBe("expand_patio");
  });
});
