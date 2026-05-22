import { describe, expect, it } from "vitest";
import { publicPlanToGenerated } from "../planGeometryAdapter";
import { buildPlanViewModel } from "../finalPlanRenderer";
import { renderArchitecturalPlanSvg } from "../final-plan/architecturalPlanSvg";
import { renderTitleBlock } from "../final-plan/sheetTitleBlock";
import type { SheetMeta } from "../final-plan/types";
import { MOCK_PUBLIC_RESULT } from "@/lib/floorplan-result/fixtures";

function baseSheet(overrides: Partial<SheetMeta> = {}): SheetMeta {
  return {
    projectTitle: "Casa Los Robles",
    variantLabel: "Variante A",
    coveredM2: 98.5,
    outdoorM2: 24,
    semiCoveredM2: 12,
    areasEstimated: true,
    showGraphicScale: false,
    showPreliminaryDimensions: true,
    ...overrides,
  };
}

describe("sheet title block", () => {
  it("renders Argentine preliminary rótulo copy", () => {
    const svg = renderTitleBlock(baseSheet());
    expect(svg).toContain('id="title-block"');
    expect(svg).toContain("Planta preliminar");
    expect(svg).toContain("Variante A");
    expect(svg).toContain("Superficie cubierta 98.5 m² aprox.");
    expect(svg).toContain("Superficie exterior 24.0 m² aprox.");
    expect(svg).toContain("Superficie semi-cubierta 12.0 m² aprox.");
    expect(svg).toContain("Escala conceptual / S.E.");
    expect(svg).toContain("Medidas preliminares estimadas");
    expect(svg).toContain("No apto para obra");
    expect(svg).toContain("Sin validez municipal");
    expect(svg).toContain("Revisión profesional requerida");
  });

  it("omits zero outdoor and semi-covered areas", () => {
    const svg = renderTitleBlock(
      baseSheet({ outdoorM2: 0, semiCoveredM2: 0, areasEstimated: false }),
    );
    expect(svg).toContain("Superficie cubierta 98.5 m²");
    expect(svg).not.toContain("Superficie exterior");
    expect(svg).not.toContain("Semi");
  });

  it("integrates with public final plan render", () => {
    const variant = MOCK_PUBLIC_RESULT.recommendedVariant;
    const model = buildPlanViewModel(publicPlanToGenerated(variant.plan), {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    const svg = renderArchitecturalPlanSvg(model).svg;
    expect(svg).not.toContain('id="architectural-walls"');
    expect(svg).toContain('id="north-arrow"');
    expect(svg).toContain("Sin validez municipal");
    expect(svg).toContain(variant.label);
  });
});
