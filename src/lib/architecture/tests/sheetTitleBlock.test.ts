import { describe, expect, it } from "vitest";
import { publicPlanToGenerated } from "../planGeometryAdapter";
import { buildPlanViewModel } from "../finalPlanRenderer";
import { renderArchitecturalPlanSvg } from "../final-plan/architecturalPlanSvg";
import { renderTitleBlock } from "../final-plan/sheetTitleBlock";
import type { SheetMeta } from "../final-plan/types";
import { MOCK_PUBLIC_RESULT } from "@/lib/floorplan-result/fixtures";

function baseSheet(overrides: Partial<SheetMeta> = {}): SheetMeta {
  return {
    projectTitle: "Casa",
    variantLabel: "Variante A",
    coveredM2: 98.5,
    outdoorM2: 24,
    semiCoveredM2: 12,
    areasEstimated: true,
    showGraphicScale: false,
    showPreliminaryDimensions: false,
    ...overrides,
  };
}

describe("sheet title block", () => {
  it("renders premium layout with required copy", () => {
    const svg = renderTitleBlock(baseSheet());
    expect(svg).toContain('id="title-block"');
    expect(svg).toContain("Planta preliminar");
    expect(svg).toContain("Variante A");
    expect(svg).toContain("Cubierta 98.5 m² est.");
    expect(svg).toContain("Exterior 24.0 m² est.");
    expect(svg).toContain("Semi 12.0 m² est.");
    expect(svg).toContain("Escala conceptual / S.E.");
    expect(svg).toContain("No apto para obra");
    expect(svg).not.toContain("Plano preliminar conceptual");
  });

  it("shows preliminary dimensions note when enabled", () => {
    const svg = renderTitleBlock(
      baseSheet({ showPreliminaryDimensions: true }),
    );
    expect(svg).toContain("Medidas preliminares estimadas");
  });

  it("omits zero outdoor and semi-covered areas", () => {
    const svg = renderTitleBlock(
      baseSheet({ outdoorM2: 0, semiCoveredM2: 0, areasEstimated: false }),
    );
    expect(svg).toContain("Cubierta 98.5 m²");
    expect(svg).not.toContain("Exterior");
    expect(svg).not.toContain("Semi");
  });

  it("integrates with public final plan render", () => {
    const variant = MOCK_PUBLIC_RESULT.recommendedVariant;
    const model = buildPlanViewModel(publicPlanToGenerated(variant.plan), {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    const svg = renderArchitecturalPlanSvg(model).svg;
    expect(svg).toContain("Escala conceptual / S.E.");
    expect(svg).toContain("No apto para obra");
    expect(svg).toContain(variant.label);
  });
});
