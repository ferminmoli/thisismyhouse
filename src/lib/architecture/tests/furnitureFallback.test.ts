import { describe, expect, it } from "vitest";
import { publicPlanToGenerated } from "../planGeometryAdapter";
import { buildPlanViewModel } from "../finalPlanRenderer";
import { renderArchitecturalPlanSvg } from "../final-plan/architecturalPlanSvg";
import { buildFurnitureWithFallback } from "../final-plan/furnitureFallback";
import { buildRooms } from "../final-plan/planGeometryUtils";
import { MOCK_PUBLIC_RESULT } from "@/lib/floorplan-result/fixtures";

describe("furniture fallback", () => {
  const variant = MOCK_PUBLIC_RESULT.recommendedVariant;
  const plan = publicPlanToGenerated(variant.plan);
  const rooms = buildRooms(plan);

  it("adds fallback symbols when plan furniture is sparse", () => {
    const sparse = buildFurnitureWithFallback(
      { ...plan, furniture: [] },
      rooms,
      true,
    );
    expect(sparse.length).toBeGreaterThan(0);
  });

  it("renders drafting background and furniture layer in public SVG", () => {
    const model = buildPlanViewModel(plan, {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    const svg = renderArchitecturalPlanSvg(model).svg;
    expect(svg).toContain('id="drafting-background"');
    expect(svg).toContain('id="arch-pat-dots"');
    expect(svg).toContain('id="furniture"');
    expect(svg).not.toContain('id="legend"');
  });
});
