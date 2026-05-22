import { describe, expect, it } from "vitest";
import { publicPlanToGenerated } from "../planGeometryAdapter";
import { buildPlanViewModel } from "../finalPlanRenderer";
import { renderArchitecturalPlanSvg } from "../final-plan/architecturalPlanSvg";
import {
  derivePreliminaryScale,
  formatLengthM,
  buildPreliminaryDimensions,
} from "../final-plan/preliminaryDimensions";
import { MOCK_PUBLIC_RESULT } from "@/lib/floorplan-result/fixtures";

describe("preliminary dimensions", () => {
  const variant = MOCK_PUBLIC_RESULT.recommendedVariant;
  const plan = publicPlanToGenerated(variant.plan);

  it("formats length with two decimals and m suffix", () => {
    expect(formatLengthM(8.4)).toBe("8,40 m");
    expect(formatLengthM(13.5)).toBe("13,50 m");
  });

  it("derives scale from area estimate and covered canvas units", () => {
    const model = buildPlanViewModel(plan, {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    const scale = derivePreliminaryScale(
      model.rooms,
      plan.metadata.areaEstimate,
    );
    expect(scale).not.toBeNull();
    expect(scale!.mPerCanvasUnit).toBeGreaterThan(0.08);
    expect(scale!.mPerCanvasUnit).toBeLessThan(2.8);
  });

  it("renders dimension layer when scale is safe", () => {
    const model = buildPlanViewModel(plan, {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    expect(model.dimensions.length).toBeGreaterThan(0);
    expect(model.dimensions.length).toBeLessThanOrEqual(4);

    const svg = renderArchitecturalPlanSvg(model).svg;
    expect(svg).toContain('id="preliminary-dimensions"');
    expect(svg).toContain("Medidas preliminares estimadas");
    expect(svg).toMatch(/\d+,\d{2} m/);
  });

  it("places covered width above and patio width below footprint", () => {
    const model = buildPlanViewModel(plan, {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    const bounds = derivePreliminaryScale(model.rooms, plan.metadata.areaEstimate);
    expect(bounds).not.toBeNull();

    const covWidth = model.dimensions.find((d) => d.id === "cov-width");
    const patioWidth = model.dimensions.find((d) => d.id === "patio-width");
    expect(covWidth).toBeDefined();
    if (covWidth && patioWidth) {
      expect(covWidth.y1).toBeLessThan(
        Math.min(...model.rooms.filter((r) => r.enclosure === "covered").map((r) => r.y)),
      );
      const patio = model.rooms.find((r) => r.enclosure === "outdoor");
      expect(patio).toBeDefined();
      expect(patioWidth!.y1).toBeGreaterThan(patio!.y + patio!.height);
    }
  });

  it("omits dimensions when scale cannot be derived safely", () => {
    const model = buildPlanViewModel(plan, {
      variantId: "x",
      variantLabel: "x",
    });
    const scale = derivePreliminaryScale(model.rooms, {
      estimatedCoveredAreaM2: 100,
      coveredCanvasUnits: 2,
      estimatedOutdoorAreaM2: 0,
      estimatedSemiCoveredAreaM2: 0,
      estimatedTotalProgramAreaM2: 100,
      targetCoveredAreaM2: 100,
      targetOutdoorAreaM2: null,
      outdoorCanvasUnits: 0,
      semiCoveredCanvasUnits: 0,
      zoneAreaEstimates: [],
      confidence: "low",
      method: "test",
    });
    expect(scale).toBeNull();
    expect(
      buildPreliminaryDimensions(model.rooms, { mPerCanvasUnit: 1, method: "area_ratio" }).length,
    ).toBeGreaterThan(0);
  });

  it("does not render dimensions in wall graph debug mode", () => {
    const model = buildPlanViewModel(plan, {
      variantId: variant.id,
      variantLabel: variant.label,
      wallGraphDebug: true,
    });
    const svg = renderArchitecturalPlanSvg(model, { wallGraphDebug: true }).svg;
    expect(svg).not.toContain('id="preliminary-dimensions"');
  });
});
