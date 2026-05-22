import { describe, expect, it } from "vitest";
import { renderFinalPlanToSvg, buildPlanViewModel } from "../finalPlanRenderer";
import { publicPlanToGenerated } from "../planGeometryAdapter";
import { MOCK_PUBLIC_RESULT } from "@/lib/floorplan-result/fixtures";
import { renderArchitecturalPlanSvg } from "../final-plan/architecturalPlanSvg";
import type { GeneratedPlan } from "../generatedPlan";

function twoRoomPlanWithHingedDoor(): GeneratedPlan {
  return {
    id: "test",
    title: "Test",
    templateId: "t",
    variantLabel: "v",
    zones: [
      {
        id: "zone_A",
        label: "Cocina",
        type: "service",
        x: 10,
        y: 10,
        width: 28,
        height: 22,
        sourceRoomId: "COCINA",
        slotId: "zone_A",
        priority: "medium",
      },
      {
        id: "zone_B",
        label: "Dormitorio 1",
        type: "private",
        x: 38,
        y: 10,
        width: 28,
        height: 22,
        sourceRoomId: "DORMITORIO_1",
        slotId: "zone_B",
        priority: "medium",
      },
    ],
    doors: [
      {
        id: "d1",
        from: "COCINA",
        to: "DORMITORIO_1",
        wall: "right",
        position: 50,
        width: 4,
        type: "door",
      },
    ],
    windows: [],
    furniture: [],
    metadata: {
      parti: "t",
      templateName: "t",
      mapping: [],
      warnings: [],
      notes: [],
    },
  };
}

describe("renderFinalPlanToSvg", () => {
  const variant = MOCK_PUBLIC_RESULT.recommendedVariant;

  it("renders sheet layout with title block and no debug chrome", () => {
    const render = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
      title: "Casa test",
    });

    expect(render.viewBox).toBe("0 0 100 118");
    expect(render.legend).toEqual([]);
    expect(render.svg).toContain("Planta preliminar");
    expect(render.svg).toContain("Escala conceptual / S.E.");
    expect(render.svg).toContain("No apto para obra");
    expect(render.svg).not.toContain('id="walls"');
    expect(render.svg).not.toContain("mutation");
    expect(render.svg).not.toContain("adjacencyScore");
  });

  it("enables wall graph layer only when wallGraphDebug is true", () => {
    const publicRender = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
      wallGraphDebug: false,
    });
    expect(publicRender.svg).toContain('id="simple-room-boundaries"');
    expect(publicRender.svg).not.toContain('id="wall-graph"');

    const debugRender = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
      wallGraphDebug: true,
    });
    expect(debugRender.svg).toContain('id="wall-graph"');
    expect(debugRender.svg).toContain("wall-graph-debug-annotations");
    expect(debugRender.svg).toContain('stroke-width="1.05"');
  });

  it("uses zone rectangles only — no duplicated wall graph strokes", () => {
    const render = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
    });

    expect(render.svg).toContain('id="simple-room-boundaries"');
    expect(render.svg).not.toContain('id="walls"');
    expect(render.svg).not.toContain('stroke-width="1.05"');
    expect(render.svg).not.toContain('stroke-width="0.22" stroke-linecap="square"/>');
    const thickWallCount = (render.svg.match(/stroke-width="1\.05"/g) ?? []).length;
    expect(thickWallCount).toBe(0);
  });

  it("draws one clean stroke per room zone", () => {
    const model = buildPlanViewModel(publicPlanToGenerated(variant.plan), {
      variantId: variant.id,
      variantLabel: variant.label,
    });
    expect(model.walls).toEqual([]);
    expect(model.rooms.length).toBeGreaterThan(0);

    const render = renderArchitecturalPlanSvg(model);
    const zoneGroup =
      render.svg.match(/<g id="simple-room-boundaries">([\s\S]*?)<\/g>/)?.[1] ?? "";
    const zoneRects = zoneGroup.match(/<rect x="/g) ?? [];
    expect(zoneRects.length).toBe(model.rooms.length);
    expect(render.svg).toMatch(/stroke-width="0\.(36|62)"/);
  });

  it("shows orientative north label when orientation unknown", () => {
    const render = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
      orientationKnown: false,
    });

    expect(render.svg).toContain("N orientativo");
  });

  it("hides north when orientation is known", () => {
    const render = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
      orientationKnown: true,
    });

    expect(render.svg).not.toContain("N orientativo");
  });

  it("renders openings as overlays without wall graph", () => {
    const hinged = renderFinalPlanToSvg({
      variantId: "t",
      variantLabel: "Test",
      plan: twoRoomPlanWithHingedDoor(),
    });
    expect(hinged.svg).toContain('id="openings"');
    expect(hinged.svg).toContain("door-hinged");
    expect(hinged.svg).toMatch(/<path d="M .* A /);
    expect(hinged.svg).not.toContain('id="walls"');

    const patio = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
    });
    expect(patio.svg).toContain('id="openings"');
    expect(patio.svg).toContain("door-wide-sliding");
    expect(patio.svg).toContain('id="simple-room-boundaries"');
  });

  it("renders windows as blue-gray double lines", () => {
    const plan: GeneratedPlan = {
      ...twoRoomPlanWithHingedDoor(),
      windows: [
        {
          id: "w1",
          zoneId: "COCINA",
          wall: "top",
          position: 50,
          width: 6,
          size: "medium",
          reason: "",
        },
      ],
    };
    const render = renderFinalPlanToSvg({
      variantId: "t",
      variantLabel: "Test",
      plan,
    });
    expect(render.svg).toContain("window-opening");
    expect(render.svg).toContain('stroke="#5B7C9A"');
  });

  it("renders open_passage to patio as wide sliding opening", () => {
    const plan: GeneratedPlan = {
      ...twoRoomPlanWithHingedDoor(),
      zones: [
        {
          id: "zone_SALA",
          label: "Estar",
          type: "social",
          x: 20,
          y: 52,
          width: 38,
          height: 28,
          sourceRoomId: "SALA_COMEDOR",
          slotId: "zone_SALA",
          priority: "medium",
        },
        {
          id: "zone_PATIO",
          label: "Patio",
          type: "outdoor",
          x: 20,
          y: 80,
          width: 56,
          height: 16,
          sourceRoomId: "PATIO",
          slotId: "zone_PATIO",
          priority: "medium",
        },
      ],
      doors: [
        {
          id: "d_patio",
          from: "SALA_COMEDOR",
          to: "PATIO",
          wall: "bottom",
          position: 50,
          width: 10,
          type: "open_passage",
        },
      ],
      windows: [],
    };
    const model = buildPlanViewModel(plan, {
      variantId: "t",
      variantLabel: "Test",
    });
    expect(model.openings[0]?.kind).toBe("wide_sliding");
    const render = renderArchitecturalPlanSvg(model);
    expect(render.svg).toContain("door-wide-sliding");
  });

  it("formats areas with one decimal and m²", () => {
    const render = renderFinalPlanToSvg({
      variantId: variant.id,
      variantLabel: variant.label,
      plan: publicPlanToGenerated(variant.plan),
    });

    expect(render.svg).toMatch(/\d+\.\d m²/);
  });

  it("renders all top variants without error", () => {
    for (const v of MOCK_PUBLIC_RESULT.topVariants) {
      const model = buildPlanViewModel(publicPlanToGenerated(v.plan), {
        variantId: v.id,
        variantLabel: v.label,
      });
      const render = renderArchitecturalPlanSvg(model);
      expect(render.svg.length).toBeGreaterThan(200);
      expect(render.viewBox).toBe("0 0 100 118");
      expect(render.svg).not.toContain('id="walls"');
    }
  });
});
