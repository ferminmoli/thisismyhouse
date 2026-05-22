import { describe, expect, it } from "vitest";
import { buildWhyNarrative, collectHighlightCards } from "./copy";
import { MOCK_PUBLIC_RESULT } from "./fixtures";

describe("floorplan-result copy", () => {
  it("builds recommended narrative from whyRecommended or brief", () => {
    const { narrative, bullets } = buildWhyNarrative(
      MOCK_PUBLIC_RESULT,
      MOCK_PUBLIC_RESULT.recommendedVariant,
      true,
    );
    expect(narrative.length).toBeGreaterThan(20);
    expect(bullets.length).toBeGreaterThan(0);
    expect(narrative.toLowerCase()).not.toContain("adjacencyscore");
  });

  it("builds alternate narrative when another variant is selected", () => {
    const patio = MOCK_PUBLIC_RESULT.topVariants.find(
      (v) => v.id === "expand_patio",
    )!;
    const { narrative, bullets } = buildWhyNarrative(MOCK_PUBLIC_RESULT, patio, false);
    expect(
      narrative.includes("Patio") ||
        narrative.includes("recomendada") ||
        bullets.some((b) => /patio|recomendada/i.test(b)),
    ).toBe(true);
  });

  it("filters internal-looking highlight lines", () => {
    const polluted = {
      ...MOCK_PUBLIC_RESULT,
      whyRecommended: ["Buen patio", "penalties applied"],
    };
    const cards = collectHighlightCards(
      polluted.recommendedVariant,
      polluted,
      true,
    );
    expect(cards.join(" ").toLowerCase()).not.toContain("penalties");
  });
});
