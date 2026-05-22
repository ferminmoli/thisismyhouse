import { describe, expect, it } from "vitest";
import {
  renderPlanToSvg,
  renderVariantsToSvg,
  PREMIUM_SVG_LAYOUT,
  humanizeZoneLabel,
  buildLegendFromPlan,
  PUBLIC_SVG_CAPTION,
  PUBLIC_SVG_DISCLAIMER,
} from "../svgRenderer";
import { enrichPlanSpatialMetadata } from "../planMetadata";
import { runFloorPlanPipeline } from "../floorPlanPipeline";
import { generatePlanVariants } from "../variantGenerator";
import { runRecommendationEngine } from "../recommendationEngine";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  TEST_PROMPT,
} from "./testHelpers";
import type { GeneratedPlan, RenderZone } from "../generatedPlan";

const PALETTE_SNIPPET = {
  outdoorFill: "#E8F2E8",
  socialFill: "#FAF6F0",
};

describe("premium svgRenderer", () => {
  it("uses compact caption and legend outside plan-drawing", async () => {
    const program = await createMockProgram();
    const plan = enrichPlanSpatialMetadata(
      await createGeneratedPlan(),
      program,
    );
    const render = renderPlanToSvg({
      variantId: "base",
      variantLabel: "Planta base",
      plan,
      title: plan.title,
    });

    expect(render.svg).toContain("<svg");
    expect(render.svg).toContain('id="plan-caption"');
    expect(render.svg).not.toContain('id="title-block"');
    expect(render.svg).toContain('id="plan-drawing"');
    expect(render.svg).toContain('id="legend"');
    expect(render.svg).toContain(PUBLIC_SVG_CAPTION);
    expect(render.viewBox).toMatch(/0 0 100 \d+/);
    expect(Number(render.viewBox.split(" ")[3])).toBeGreaterThan(100);
    expect(render.svg).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it("does not duplicate large page titles inside SVG", async () => {
    const program = await createMockProgram();
    const plan = enrichPlanSpatialMetadata(
      await createGeneratedPlan(),
      program,
    );
    const label = "Lavadero en extensión de cocina";
    const render = renderPlanToSvg({
      variantId: "add_laundry",
      variantLabel: label,
      plan,
      title: "Casa familiar en L con patio",
    });
    expect(render.svg).not.toContain(">Casa familiar en L con patio<");
    expect(render.variantLabel).toBe(label);
    expect(render.svg).toContain("<title>");
  });

  it("builds legend only from zone types present", () => {
    const plan = createMinimalPlan({
      extraZones: [
        {
          id: "zone_DIST",
          label: "Distrib.",
          type: "circulation",
          x: 55,
          y: 40,
          width: 8,
          height: 6,
          sourceRoomId: "DISTRIBUIDOR",
          slotId: "d",
          priority: "low",
        },
      ],
    });
    const legend = buildLegendFromPlan(plan.zones);
    expect(legend.some((l) => l.label === "Circulación")).toBe(true);
    const render = renderPlanToSvg({
      variantId: "leg",
      variantLabel: "Leg",
      plan,
    });
    expect(render.svg).toContain("Circulación");
    expect(render.svg).not.toContain("Semi-cubierto");
  });

  it("uses label halo styling for readability", () => {
    const render = renderPlanToSvg({
      variantId: "halo",
      variantLabel: "Halo",
      plan: createMinimalPlan(),
    });
    expect(render.svg).toContain('paint-order="stroke fill"');
  });

  it("does not emit raw room ids in visible labels", () => {
    const render = renderPlanToSvg({
      variantId: "ids",
      variantLabel: "Ids",
      plan: createMinimalPlan({
        extraZones: [
          {
            id: "zone_DORMITORIO_2",
            label: "DORMITORIO_2",
            type: "private",
            x: 70,
            y: 20,
            width: 12,
            height: 10,
            sourceRoomId: "DORMITORIO_2",
            slotId: "d2",
            priority: "medium",
          },
        ],
      }),
    });
    expect(render.svg).toContain("Dormitorio 2");
    expect(render.svg).not.toContain(">DORMITORIO_2<");
  });

  it("humanizes room labels", () => {
    expect(
      humanizeZoneLabel({
        id: "z1",
        label: "SALA_COMEDOR",
        type: "social",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        sourceRoomId: "SALA_COMEDOR",
        slotId: "s",
        priority: "high",
      }),
    ).toBe("Estar / comedor");

    expect(
      humanizeZoneLabel({
        id: "z2",
        label: "zone_LAVADERO",
        type: "service",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        sourceRoomId: "LAVADERO",
        slotId: "l",
        priority: "medium",
      }),
    ).toBe("Lavadero");
  });

  it("hides area label in small rooms but shows in large rooms", () => {
    const plan = createMinimalPlan();
    const render = renderPlanToSvg({
      variantId: "test",
      variantLabel: "Test",
      plan,
    });
    expect(render.svg).toContain("26 m²");
    const tiny = createMinimalPlan({
      extraZones: [
        {
          id: "zone_BANO",
          label: "Baño",
          type: "service",
          x: 58,
          y: 32,
          width: 3,
          height: 3.5,
          sourceRoomId: "BANO",
          slotId: "b",
          priority: "low",
        },
      ],
      areaEstimates: [
        {
          roomId: "BANO",
          type: "service",
          estimatedAreaM2: 4,
          areaKind: "covered",
        },
      ],
    });
    const tinyRender = renderPlanToSvg({
      variantId: "tiny",
      variantLabel: "Tiny",
      plan: tiny,
    });
    const banoM2 = (tinyRender.svg.match(/4 m²/g) ?? []).length;
    expect(banoM2).toBe(0);
  });

  it("renders Lavadero zone and patio as outdoor when present", async () => {
    const program = await createMockProgram(TEST_PROMPT);
    const base = await createGeneratedPlan();
    const topology = await createMockTopology(program);
    const variants = generatePlanVariants({
      basePlan: base,
      topologyGraph: topology,
      program,
    });
    const engine = runRecommendationEngine({
      program,
      topologyGraph: topology,
      referencePlan: base,
      variants,
      userPrompt: TEST_PROMPT,
    });
    const rec = engine.recommendedVariant!;
    const render = renderPlanToSvg({
      variantId: rec.mutationType,
      variantLabel: rec.label,
      plan: rec.plan,
      title: program.title,
    });

    expect(rec.label).toMatch(/lavadero/i);
    expect(render.svg).toContain("pat-outdoor");
    expect(render.svg).toContain(PALETTE_SNIPPET.outdoorFill);
    const hasLaundry =
      render.svg.includes("Lavadero") ||
      rec.plan.zones.some((z) => /lavadero/i.test(z.label));
    expect(hasLaundry).toBe(true);
  });

  it("legend sits below plan drawing area", () => {
    const render = renderPlanToSvg({
      variantId: "test",
      variantLabel: "Test",
      plan: createMinimalPlan(),
    });
    const planEnd =
      PREMIUM_SVG_LAYOUT.captionH +
      PREMIUM_SVG_LAYOUT.gap +
      100 +
      PREMIUM_SVG_LAYOUT.gap;
    expect(render.svg.indexOf('id="plan-drawing"')).toBeLessThan(
      render.svg.indexOf('id="legend"'),
    );
    const legendY = render.svg.match(/id="legend"[^>]*transform="translate\([^,]+,\s*([\d.]+)\)"/);
    if (legendY) {
      expect(Number(legendY[1])).toBeGreaterThan(planEnd - 2);
    }
    expect(planEnd).toBeLessThan(Number(render.viewBox.split(" ")[3]));
  });

  it("does not embed scorer/debug tokens in SVG", () => {
    const render = renderPlanToSvg({
      variantId: "base",
      variantLabel: "Base",
      plan: createMinimalPlan(),
    });
    const lower = render.svg.toLowerCase();
    expect(lower).not.toContain("penalties");
    expect(lower).not.toContain("mutationintentscore");
    expect(lower).not.toContain("hardadjacency");
    expect(lower).not.toContain("adjacencyscore");
  });

  it("distinguishes outdoor and semi_outdoor patterns", () => {
    const plan = createMinimalPlan({
      extraZones: [
        {
          id: "zone_GALERIA",
          label: "Galería",
          type: "semi_outdoor",
          x: 60,
          y: 60,
          width: 20,
          height: 15,
          sourceRoomId: "GALERIA",
          slotId: "g",
          priority: "medium",
        },
      ],
    });
    const render = renderPlanToSvg({
      variantId: "gallery_patio",
      variantLabel: "Galería",
      plan,
    });
    expect(render.svg).toContain("pat-outdoor");
    expect(render.svg).toContain("pat-semi");
    expect(render.svg).toContain("Galería");
  });

  it("exports public disclaimer constant for UI", () => {
    expect(PUBLIC_SVG_DISCLAIMER).toMatch(/documentación técnica/i);
  });

  it("renderVariantsToSvg produces distinct variant metadata", async () => {
    const program = await createMockProgram();
    const plan = enrichPlanSpatialMetadata(
      await createGeneratedPlan(),
      program,
    );
    const renders = renderVariantsToSvg([
      { mutationType: "base", label: "A", plan },
      { mutationType: "expand_patio", label: "B", plan },
    ]);
    expect(renders[0]!.variantLabel).toBe("A");
    expect(renders[1]!.variantLabel).toBe("B");
  });

  it("pipeline recommended variant reaches renderer", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const rec = result.publicResult.recommendedVariant;
    const render = renderPlanToSvg({
      variantId: rec.id,
      variantLabel: rec.label,
      plan: publicPlanToGenerated(rec.plan),
      title: result.publicResult.title,
    });
    expect(render.variantId).toBe(rec.id);
    expect(render.svg).toContain('id="plan-drawing"');
  }, 30_000);
});

function publicPlanToGenerated(
  plan: import("../publicFloorPlanTypes").PublicPlanGeometry,
): GeneratedPlan {
  return {
    id: plan.id,
    title: plan.title,
    templateId: plan.templateId ?? "t",
    variantLabel: plan.variantLabel ?? "",
    zones: plan.zones.map((z) => ({
      id: z.id,
      label: z.label,
      type: z.type as RenderZone["type"],
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      sourceRoomId: z.id.replace(/^zone_/, ""),
      slotId: z.id,
      priority: "medium",
    })),
    doors: [],
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

function createMinimalPlan(opts?: {
  extraZones?: RenderZone[];
  areaEstimates?: GeneratedPlan["metadata"]["areaEstimate"] extends infer E
    ? E extends { zoneAreaEstimates: infer Z }
      ? Z
      : never
    : never;
}): GeneratedPlan {
  const zoneEstimates = opts?.areaEstimates ?? [
    {
      roomId: "LIVING",
      type: "social" as const,
      estimatedAreaM2: 26,
      areaKind: "covered" as const,
    },
    {
      roomId: "PATIO",
      type: "outdoor" as const,
      estimatedAreaM2: 10,
      areaKind: "outdoor" as const,
    },
  ];

  return {
    id: "p-test",
    title: "Casa test",
    templateId: "t",
    variantLabel: "Test",
    zones: [
      {
        id: "zone_LIVING",
        label: "Sala / comedor",
        type: "social",
        x: 20,
        y: 30,
        width: 35,
        height: 25,
        sourceRoomId: "LIVING",
        slotId: "s1",
        priority: "high",
      },
      {
        id: "zone_PATIO",
        label: "Patio",
        type: "outdoor",
        x: 20,
        y: 60,
        width: 50,
        height: 18,
        sourceRoomId: "PATIO",
        slotId: "p1",
        priority: "medium",
      },
      ...(opts?.extraZones ?? []),
    ],
    doors: [],
    windows: [],
    furniture: [],
    metadata: {
      parti: "t",
      templateName: "t",
      mapping: [],
      warnings: [],
      notes: [],
      areaEstimate: {
        targetCoveredAreaM2: 80,
        estimatedCoveredAreaM2: 80,
        targetOutdoorAreaM2: 10,
        estimatedOutdoorAreaM2: 10,
        estimatedSemiCoveredAreaM2: 0,
        estimatedTotalProgramAreaM2: 90,
        coveredCanvasUnits: 0,
        outdoorCanvasUnits: 0,
        semiCoveredCanvasUnits: 0,
        zoneAreaEstimates: zoneEstimates,
        confidence: "medium",
        method: "test",
      },
    },
  };
}
