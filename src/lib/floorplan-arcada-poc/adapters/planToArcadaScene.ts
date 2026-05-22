import type { PublicPlanGeometry } from "@/lib/architecture/publicFloorPlanTypes";
import { architecturalRoomName } from "@/lib/architecture/final-plan/roomNames";
import type { RenderZone } from "@/lib/architecture/generatedPlan";
import type {
  ArcadaPocFurniture,
  ArcadaPocLabel,
  ArcadaPocOpening,
  ArcadaPocRoom,
  ArcadaPocScene,
  ArcadaPocWall,
  ArcadaWallSide,
} from "../types/arcadaPocTypes";

const EPS = 0.2;
const CANVAS = 100;

type ZoneLike = {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  estimatedAreaM2?: number;
  areaKind?: "covered" | "outdoor" | "semi_covered";
};

function norm(id: string): string {
  return id.trim().toUpperCase().replace(/^ZONE_/, "");
}

function zoneToRenderZone(z: ZoneLike): RenderZone {
  return {
    id: z.id,
    label: z.label,
    type: z.type as RenderZone["type"],
    x: z.x,
    y: z.y,
    width: z.width,
    height: z.height,
    sourceRoomId: norm(z.id),
    slotId: z.id,
    priority: "medium",
  };
}

function rectPolygon(z: ZoneLike) {
  return [
    { x: z.x, y: z.y },
    { x: z.x + z.width, y: z.y },
    { x: z.x + z.width, y: z.y + z.height },
    { x: z.x, y: z.y + z.height },
  ];
}

function horizontalOverlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number,
): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function verticalOverlap(
  a1: number,
  a2: number,
  b1: number,
  b2: number,
): number {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

function sharesTopBottom(
  a: ZoneLike,
  b: ZoneLike,
): "a_top_b_bottom" | "b_top_a_bottom" | null {
  if (
    Math.abs(a.y - (b.y + b.height)) < EPS &&
    horizontalOverlap(a.x, a.x + a.width, b.x, b.x + b.width) > EPS
  ) {
    return "a_top_b_bottom";
  }
  if (
    Math.abs(b.y - (a.y + a.height)) < EPS &&
    horizontalOverlap(a.x, a.x + a.width, b.x, b.x + b.width) > EPS
  ) {
    return "b_top_a_bottom";
  }
  return null;
}

function sharesLeftRight(
  a: ZoneLike,
  b: ZoneLike,
): "a_right_b_left" | "b_right_a_left" | null {
  if (
    Math.abs(a.x + a.width - b.x) < EPS &&
    verticalOverlap(a.y, a.y + a.height, b.y, b.y + b.height) > EPS
  ) {
    return "a_right_b_left";
  }
  if (
    Math.abs(b.x + b.width - a.x) < EPS &&
    verticalOverlap(a.y, a.y + a.height, b.y, b.y + b.height) > EPS
  ) {
    return "b_right_a_left";
  }
  return null;
}

function edgeSegment(
  z: ZoneLike,
  side: ArcadaWallSide,
): { x1: number; y1: number; x2: number; y2: number } {
  switch (side) {
    case "top":
      return { x1: z.x, y1: z.y, x2: z.x + z.width, y2: z.y };
    case "bottom":
      return {
        x1: z.x,
        y1: z.y + z.height,
        x2: z.x + z.width,
        y2: z.y + z.height,
      };
    case "left":
      return { x1: z.x, y1: z.y, x2: z.x, y2: z.y + z.height };
    case "right":
      return {
        x1: z.x + z.width,
        y1: z.y,
        x2: z.x + z.width,
        y2: z.y + z.height,
      };
  }
}

function interiorKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = `${x1.toFixed(1)},${y1.toFixed(1)}`;
  const b = `${x2.toFixed(1)},${y2.toFixed(1)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function buildWalls(zones: ZoneLike[]): ArcadaPocWall[] {
  const walls: ArcadaPocWall[] = [];
  const interiorDrawn = new Set<string>();
  let wallIdx = 0;

  const isOutdoor = (z: ZoneLike) =>
    z.areaKind === "outdoor" || z.areaKind === "semi_covered";

  for (const a of zones) {
    for (const b of zones) {
      if (a.id >= b.id) continue;

      const tb = sharesTopBottom(a, b);
      if (tb) {
        const upper = tb === "a_top_b_bottom" ? a : b;
        const lower = tb === "a_top_b_bottom" ? b : a;
        const x1 = Math.max(upper.x, lower.x);
        const x2 = Math.min(upper.x + upper.width, lower.x + lower.width);
        const y = upper.y + upper.height;
        const key = interiorKey(x1, y, x2, y);
        if (!interiorDrawn.has(key)) {
          interiorDrawn.add(key);
          walls.push({
            id: `wall-int-${wallIdx++}`,
            roomIds: [a.id, b.id],
            from: { x: x1, y },
            to: { x: x2, y },
            thickness: 0.34,
            kind: "interior",
          });
        }
        continue;
      }

      const lr = sharesLeftRight(a, b);
      if (lr) {
        const left = lr === "a_right_b_left" ? a : b;
        const right = lr === "a_right_b_left" ? b : a;
        const y1 = Math.max(left.y, right.y);
        const y2 = Math.min(left.y + left.height, right.y + right.height);
        const x = left.x + left.width;
        const key = interiorKey(x, y1, x, y2);
        if (!interiorDrawn.has(key)) {
          interiorDrawn.add(key);
          walls.push({
            id: `wall-int-${wallIdx++}`,
            roomIds: [a.id, b.id],
            from: { x, y: y1 },
            to: { x, y: y2 },
            thickness: 0.34,
            kind: "interior",
          });
        }
      }
    }
  }

  for (const room of zones) {
    const sides: ArcadaWallSide[] = ["top", "right", "bottom", "left"];
    for (const side of sides) {
      let shared = false;
      for (const other of zones) {
        if (other.id === room.id) continue;
        const tb = sharesTopBottom(room, other);
        const lr = sharesLeftRight(room, other);
        const touches =
          (side === "top" && tb === "a_top_b_bottom") ||
          (side === "bottom" && tb === "b_top_a_bottom") ||
          (side === "right" && lr === "a_right_b_left") ||
          (side === "left" && lr === "b_right_a_left");
        if (touches) {
          shared = true;
          break;
        }
      }
      if (shared && !isOutdoor(room)) continue;

      const seg = edgeSegment(room, side);
      const outdoor = isOutdoor(room);
      walls.push({
        id: `wall-ext-${wallIdx++}`,
        roomIds: [room.id],
        from: { x: seg.x1, y: seg.y1 },
        to: { x: seg.x2, y: seg.y2 },
        thickness: outdoor ? 0.24 : 0.95,
        kind: "exterior",
        dashed: outdoor,
      });
    }
  }

  return walls;
}

function findZone(zones: ZoneLike[], ref: string): ZoneLike | undefined {
  const key = norm(ref);
  return zones.find(
    (z) => norm(z.id) === key || norm(z.label) === key || z.id === ref,
  );
}

function openingOnWall(
  wall: ArcadaPocWall,
  wallSide: ArcadaWallSide,
  position: number,
  width: number,
): { x1: number; y1: number; x2: number; y2: number } | null {
  const dx = wall.to.x - wall.from.x;
  const dy = wall.to.y - wall.from.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) return null;

  const t = position / 100;
  const half = (width / 100) * len * 0.5;
  const mx = wall.from.x + dx * t;
  const my = wall.from.y + dy * t;
  const nx = (-dy / len) * half;
  const ny = (dx / len) * half;

  if (wallSide === "top" || wallSide === "bottom") {
    return {
      x1: mx - Math.abs(dx) * (width / 100) * 0.5,
      y1: wall.from.y,
      x2: mx + Math.abs(dx) * (width / 100) * 0.5,
      y2: wall.from.y,
    };
  }
  return {
    x1: wall.from.x,
    y1: my - Math.abs(dy) * (width / 100) * 0.5,
    x2: wall.from.x,
    y2: my + Math.abs(dy) * (width / 100) * 0.5,
  };
}

function attachOpenings(
  plan: PublicPlanGeometry,
  zones: ZoneLike[],
  walls: ArcadaPocWall[],
): { openings: ArcadaPocOpening[]; warnings: string[] } {
  const warnings: string[] = [];
  const openings: ArcadaPocOpening[] = [];

  for (const door of plan.doors ?? []) {
    const fromZ = findZone(zones, door.from);
    const wallSide = door.wall as ArcadaWallSide;
    const type =
      door.type === "open_passage"
        ? "open_passage"
        : door.type === "sliding"
          ? "sliding"
          : "door";

    let wall = walls.find(
      (w) =>
        w.roomIds.includes(fromZ?.id ?? "") &&
        Math.abs(w.from.y - (fromZ ? edgeSegment(fromZ, wallSide).y1 : 0)) < 1.5,
    );

    if (!wall && fromZ) {
      wall = walls.find((w) => w.roomIds.includes(fromZ.id));
    }

    const coords =
      wall && fromZ
        ? openingOnWall(wall, wallSide, door.position, door.width)
        : fromZ
          ? (() => {
              const e = edgeSegment(fromZ, wallSide);
              const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1) || 1;
              const t = door.position / 100;
              const hw = (door.width / 100) * len * 0.5;
              return {
                x1: e.x1 + (e.x2 - e.x1) * t - hw,
                y1: e.y1 + (e.y2 - e.y1) * t - hw,
                x2: e.x1 + (e.x2 - e.x1) * t + hw,
                y2: e.y1 + (e.y2 - e.y1) * t + hw,
              };
            })()
          : null;

    if (!coords) {
      warnings.push(`door:${door.id}:no-wall-match`);
      continue;
    }

    openings.push({
      id: door.id,
      type,
      wallId: wall?.id,
      fromRoomId: fromZ?.id,
      toRoomId: findZone(zones, door.to)?.id,
      wall: wallSide,
      position: door.position,
      width: door.width,
      ...coords,
    });
  }

  for (const win of plan.windows ?? []) {
    const zone = findZone(zones, win.zoneId);
    const wallSide = win.wall as ArcadaWallSide;
    const wall = zone
      ? walls.find((w) => w.roomIds.includes(zone.id))
      : undefined;
    const coords =
      wall && zone
        ? openingOnWall(wall, wallSide, win.position, win.width)
        : zone
          ? (() => {
              const e = edgeSegment(zone, wallSide);
              const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1) || 1;
              const t = win.position / 100;
              const hw = (win.width / 100) * len * 0.5;
              return {
                x1: e.x1 + (e.x2 - e.x1) * t - hw,
                y1: e.y1 + (e.y2 - e.y1) * t,
                x2: e.x1 + (e.x2 - e.x1) * t + hw,
                y2: e.y1 + (e.y2 - e.y1) * t,
              };
            })()
          : null;

    if (!coords) {
      warnings.push(`window:${win.id}:no-wall-match`);
      continue;
    }

    openings.push({
      id: win.id,
      type: "window",
      wallId: wall?.id,
      roomId: zone?.id,
      wall: wallSide,
      position: win.position,
      width: win.width,
      ...coords,
    });
  }

  return { openings, warnings };
}

function buildLabels(rooms: ArcadaPocRoom[]): ArcadaPocLabel[] {
  const labels: ArcadaPocLabel[] = [];
  for (const r of rooms) {
    const xs = r.polygon.map((p) => p.x);
    const ys = r.polygon.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const minDim = Math.min(w, h);
    if (minDim < 2.2) continue;
    labels.push({
      roomId: r.id,
      name: r.label,
      areaText:
        r.areaM2 != null && minDim >= 5 ? `${r.areaM2.toFixed(1)} m²` : null,
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    });
  }
  return labels;
}

function buildFurniture(
  plan: PublicPlanGeometry,
  zones: ZoneLike[],
): ArcadaPocFurniture[] {
  return (plan.furniture ?? []).map((f, i) => {
    const zone = findZone(zones, f.zoneId);
    return {
      id: f.id ?? `furn-${i}`,
      type: f.type,
      roomId: zone?.id ?? f.zoneId,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
    };
  });
}

export type PlanToArcadaResult = {
  scene: ArcadaPocScene;
  warnings: string[];
};

/** Public plan geometry → Arcada-compatible scene (POC adapter). */
export function planToArcadaScene(plan: PublicPlanGeometry): PlanToArcadaResult {
  const zones: ZoneLike[] = plan.zones.map((z) => ({ ...z }));

  const rooms: ArcadaPocRoom[] = zones.map((z) => ({
    id: z.id,
    label: architecturalRoomName(zoneToRenderZone(z)),
    type: z.type,
    polygon: rectPolygon(z),
    areaM2: z.estimatedAreaM2,
    areaKind: z.areaKind ?? "covered",
  }));

  const walls = buildWalls(zones);
  const { openings, warnings: openWarnings } = attachOpenings(
    plan,
    zones,
    walls,
  );

  const scene: ArcadaPocScene = {
    canvas: {
      width: CANVAS,
      height: CANVAS,
      unit: "normalized",
      scaleLabel: "Escala conceptual / S.E.",
    },
    rooms,
    walls,
    openings,
    furniture: buildFurniture(plan, zones),
    labels: buildLabels(rooms),
  };

  return { scene, warnings: openWarnings };
}
