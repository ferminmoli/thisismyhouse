import { describe, expect, it } from "vitest";
import type { PublicPlanGeometry } from "@/lib/architecture/publicFloorPlanTypes";
import { planToArcadaScene } from "./planToArcadaScene";
import { renderArcadaPocSvg } from "../render/arcadaPocSvg";

function planWithZones(
  zones: PublicPlanGeometry["zones"],
  extras: Partial<PublicPlanGeometry> = {},
): PublicPlanGeometry {
  return {
    id: "test",
    title: "Test",
    templateId: "t",
    variantLabel: "Base",
    zones,
    doors: [],
    windows: [],
    furniture: [],
    ...extras,
  };
}

describe("planToArcadaScene", () => {
  it("converts zones to rectangular polygons and labels", () => {
    const { scene } = planToArcadaScene(
      planWithZones([
        {
          id: "zone_A",
          label: "Sala",
          type: "social",
          x: 10,
          y: 10,
          width: 30,
          height: 20,
          estimatedAreaM2: 18,
        },
      ]),
    );

    expect(scene.rooms).toHaveLength(1);
    expect(scene.rooms[0].polygon).toHaveLength(4);
    expect(scene.rooms[0].polygon[1]).toEqual({ x: 40, y: 10 });
    expect(scene.labels[0]?.name).toBeTruthy();
    expect(scene.labels[0]?.areaText).toContain("m²");
  });

  it("merges shared vertical wall between adjacent rooms", () => {
    const { scene } = planToArcadaScene(
      planWithZones([
        {
          id: "zone_L",
          label: "Living",
          type: "social",
          x: 0,
          y: 0,
          width: 40,
          height: 30,
        },
        {
          id: "zone_R",
          label: "Cocina",
          type: "service",
          x: 40,
          y: 0,
          width: 30,
          height: 30,
        },
      ]),
    );

    const interior = scene.walls.filter((w) => w.kind === "interior");
    expect(interior).toHaveLength(1);
    expect(interior[0].roomIds).toHaveLength(2);
    expect(interior[0].from.x).toBe(40);
    expect(interior[0].to.x).toBe(40);
  });

  it("marks exposed edges as exterior and outdoor zones dashed", () => {
    const { scene } = planToArcadaScene(
      planWithZones([
        {
          id: "zone_IN",
          label: "Sala",
          type: "social",
          x: 20,
          y: 20,
          width: 40,
          height: 40,
          areaKind: "covered",
        },
        {
          id: "zone_OUT",
          label: "Patio",
          type: "outdoor",
          x: 20,
          y: 60,
          width: 40,
          height: 20,
          areaKind: "outdoor",
        },
      ]),
    );

    const exterior = scene.walls.filter((w) => w.kind === "exterior");
    expect(exterior.length).toBeGreaterThan(0);
    const patioWalls = exterior.filter((w) => w.dashed);
    expect(patioWalls.length).toBeGreaterThan(0);
    expect(scene.rooms.find((r) => r.type === "outdoor")?.areaKind).toBe(
      "outdoor",
    );
  });

  it("attaches doors without crashing when wall match is approximate", () => {
    const { scene, warnings } = planToArcadaScene(
      planWithZones(
        [
          {
            id: "zone_SALA",
            label: "Sala",
            type: "social",
            x: 10,
            y: 10,
            width: 40,
            height: 30,
          },
        ],
        {
          doors: [
            {
              id: "d1",
              from: "SALA",
              to: "EXT",
              type: "standard",
              wall: "right",
              position: 50,
              width: 6,
            },
          ],
        },
      ),
    );

    expect(scene.openings.length).toBeGreaterThanOrEqual(1);
    expect(warnings.length).toBeGreaterThanOrEqual(0);
    const svg = renderArcadaPocSvg(scene).svg;
    expect(svg).toContain("arcada-door");
  });

  it("renders windows on matched walls", () => {
    const { scene } = planToArcadaScene(
      planWithZones(
        [
          {
            id: "zone_BED",
            label: "Dormitorio",
            type: "private",
            x: 5,
            y: 5,
            width: 25,
            height: 20,
          },
        ],
        {
          windows: [
            {
              id: "w1",
              zoneId: "zone_BED",
              wall: "top",
              position: 50,
              width: 8,
              size: "medium",
            },
          ],
        },
      ),
    );

    expect(scene.openings.some((o) => o.type === "window")).toBe(true);
    const svg = renderArcadaPocSvg(scene).svg;
    expect(svg).toContain("arcada-window");
  });
});
