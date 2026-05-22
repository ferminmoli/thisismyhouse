import { describe, expect, it } from "vitest";
import { renderPlanToSvg } from "../svgRenderer";
import { createGeneratedPlan } from "./testHelpers";

describe("svgRenderer", () => {
  it("produces valid SVG with viewBox and zone labels", async () => {
    const plan = await createGeneratedPlan();
    const render = renderPlanToSvg({
      variantId: "base",
      variantLabel: "Base",
      plan,
    });

    expect(render.svg).toContain("<svg");
    expect(render.svg).toContain('viewBox="0 0 100 100"');
    expect(render.coordinateSystem).toBe("normalized_canvas");
    expect(render.legend.length).toBeGreaterThan(0);
    expect(render.warnings.some((w) => /conceptual/i.test(w))).toBe(true);
    expect(render.svg).toContain("PATIO");
  });
});
