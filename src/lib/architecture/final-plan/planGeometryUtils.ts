import type { GeneratedPlan, RenderDoor, RenderWindow, RenderZone } from "../generatedPlan";
import { enclosureOfZone, isOutdoorSpace } from "../spaceClassification";
import type {
  PlanLayout,
  PlanOpening,
  PlanRoom,
  PlanWindow,
  RoomBoundaryRole,
  WallSegment,
  WallSide,
} from "./types";
import { architecturalRoomName, wetRoomKind } from "./roomNames";

export const SHEET = {
  width: 100,
  height: 118,
  titleBlockH: 14,
  margin: 3,
  planPad: 0.75,
} as const;

export const STROKE = {
  exterior: 1.05,
  exteriorOuter: 0.22,
  interior: 0.32,
  opening: 0.28,
  window: 0.34,
  windowGlass: 0.18,
  door: 0.3,
  doorArc: 0.2,
  furniture: 0.06,
} as const;

const EPS = 0.4;

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatAreaM2(value: number): string {
  return `${value.toFixed(1)} m²`;
}

export function norm(id: string): string {
  return id.trim().toUpperCase().replace(/^ZONE_/, "");
}

export function findZone(
  zones: RenderZone[],
  roomOrZoneId: string,
): RenderZone | undefined {
  const key = norm(roomOrZoneId);
  return zones.find(
    (z) =>
      norm(z.sourceRoomId) === key ||
      norm(z.id) === key ||
      norm(z.id) === `ZONE_${key}`,
  );
}

export function zoneAreaM2(
  plan: GeneratedPlan,
  zone: RenderZone,
): { value: number | null; estimated: boolean } {
  const keys = new Set<string>();
  const add = (s: string) => {
    const n = norm(s);
    if (n) keys.add(n);
  };
  add(zone.sourceRoomId);
  add(zone.id);
  add(zone.label);

  const estimates = plan.metadata.areaEstimate?.zoneAreaEstimates;
  if (estimates?.length) {
    const match = estimates.find((e) => {
      const rid = norm(e.roomId);
      return keys.has(rid) || keys.has(norm(e.roomId));
    });
    if (match?.estimatedAreaM2 != null) {
      return { value: match.estimatedAreaM2, estimated: true };
    }
  }
  return { value: null, estimated: true };
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

function sharesTopBottom(a: RenderZone, b: RenderZone): "a_top_b_bottom" | "b_top_a_bottom" | null {
  if (Math.abs(a.y - (b.y + b.height)) < EPS && horizontalOverlap(a.x, a.x + a.width, b.x, b.x + b.width) > EPS) {
    return "a_top_b_bottom";
  }
  if (Math.abs(b.y - (a.y + a.height)) < EPS && horizontalOverlap(a.x, a.x + a.width, b.x, b.x + b.width) > EPS) {
    return "b_top_a_bottom";
  }
  return null;
}

function sharesLeftRight(a: RenderZone, b: RenderZone): "a_right_b_left" | "b_right_a_left" | null {
  if (Math.abs(a.x + a.width - b.x) < EPS && verticalOverlap(a.y, a.y + a.height, b.y, b.y + b.height) > EPS) {
    return "a_right_b_left";
  }
  if (Math.abs(b.x + b.width - a.x) < EPS && verticalOverlap(a.y, a.y + a.height, b.y, b.y + b.height) > EPS) {
    return "b_right_a_left";
  }
  return null;
}

function roomBox(r: PlanRoom) {
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

/** Whether a covered room has any edge not shared with another covered room. */
export function computeRoomBoundaryRole(
  room: PlanRoom,
  all: PlanRoom[],
): RoomBoundaryRole {
  if (room.enclosure === "outdoor") return "outdoor";
  if (room.enclosure === "semi_covered") return "semi";

  const self = roomBox(room);
  const edges: WallSide[] = ["top", "right", "bottom", "left"];

  for (const side of edges) {
    let hasCoveredNeighbor = false;
    for (const other of all) {
      if (other.id === room.id || other.enclosure !== "covered") continue;
      const o = roomBox(other);
      const tb = sharesTopBottom(
        self as RenderZone,
        o as RenderZone,
      );
      const lr = sharesLeftRight(self as RenderZone, o as RenderZone);
      const shares =
        (side === "top" && tb === "a_top_b_bottom") ||
        (side === "bottom" && tb === "b_top_a_bottom") ||
        (side === "right" && lr === "a_right_b_left") ||
        (side === "left" && lr === "b_right_a_left");
      if (shares) {
        hasCoveredNeighbor = true;
        break;
      }
    }
    if (!hasCoveredNeighbor) return "perimeter";
  }

  return "interior";
}

export function buildRooms(plan: GeneratedPlan): PlanRoom[] {
  const base = plan.zones.map((z) => {
    const area = zoneAreaM2(plan, z);
    return {
      id: z.id,
      displayName: architecturalRoomName(z),
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      enclosure: enclosureOfZone(z),
      zoneType: z.type,
      wetKind: wetRoomKind(z),
      boundaryRole: "interior" as RoomBoundaryRole,
      areaM2: area.value,
      areaIsEstimated: area.estimated,
    };
  });
  return base.map((room) => ({
    ...room,
    boundaryRole: computeRoomBoundaryRole(room, base),
  }));
}

export function buildWallSegments(rooms: PlanRoom[]): WallSegment[] {
  const zones = rooms;
  const segments: WallSegment[] = [];
  const interiorDrawn = new Set<string>();

  for (const a of zones) {
    for (const b of zones) {
      if (a.id >= b.id) continue;

      const tb = sharesTopBottom(
        { x: a.x, y: a.y, width: a.width, height: a.height } as RenderZone,
        { x: b.x, y: b.y, width: b.width, height: b.height } as RenderZone,
      );
      if (tb) {
        const upper = tb === "a_top_b_bottom" ? a : b;
        const lower = tb === "a_top_b_bottom" ? b : a;
        const x1 = Math.max(upper.x, lower.x);
        const x2 = Math.min(upper.x + upper.width, lower.x + lower.width);
        const y = upper.y + upper.height;
        if (a.enclosure === "covered" && b.enclosure === "covered") {
          const key = `i:${x1.toFixed(1)}:${y.toFixed(1)}:${x2.toFixed(1)}`;
          if (!interiorDrawn.has(key)) {
            interiorDrawn.add(key);
            segments.push({ x1, y1: y, x2, y2: y, kind: "interior" });
          }
        }
      }

      const lr = sharesLeftRight(
        { x: a.x, y: a.y, width: a.width, height: a.height } as RenderZone,
        { x: b.x, y: b.y, width: b.width, height: b.height } as RenderZone,
      );
      if (lr) {
        const left = lr === "a_right_b_left" ? a : b;
        const right = lr === "a_right_b_left" ? b : a;
        const y1 = Math.max(left.y, right.y);
        const y2 = Math.min(left.y + left.height, right.y + right.height);
        const x = left.x + left.width;
        if (a.enclosure === "covered" && b.enclosure === "covered") {
          const key = `i:${x.toFixed(1)}:${y1.toFixed(1)}:${y2.toFixed(1)}`;
          if (!interiorDrawn.has(key)) {
            interiorDrawn.add(key);
            segments.push({ x1: x, y1, x2: x, y2, kind: "interior" });
          }
        }
      }
    }
  }

  for (const room of zones) {
    const { x, y, width, height, enclosure } = room;
    const edges: Array<{ x1: number; y1: number; x2: number; y2: number; side: WallSide }> = [
      { x1: x, y1: y, x2: x + width, y2: y, side: "top" },
      { x1: x + width, y1: y, x2: x + width, y2: y + height, side: "right" },
      { x1: x, y1: y + height, x2: x + width, y2: y + height, side: "bottom" },
      { x1: x, y1: y, x2: x, y2: y + height, side: "left" },
    ];

    for (const edge of edges) {
      let hasCoveredNeighbor = false;
      let touchesOutdoor = false;

      for (const other of zones) {
        if (other.id === room.id) continue;
        const oz = {
          x: other.x,
          y: other.y,
          width: other.width,
          height: other.height,
        } as RenderZone;
        const rz = { x, y, width, height } as RenderZone;
        const tb = sharesTopBottom(rz, oz);
        const lr = sharesLeftRight(rz, oz);

        const shares =
          (edge.side === "top" && tb === "a_top_b_bottom") ||
          (edge.side === "bottom" && tb === "b_top_a_bottom") ||
          (edge.side === "right" && lr === "a_right_b_left") ||
          (edge.side === "left" && lr === "b_right_a_left");

        if (shares) {
          if (other.enclosure === "covered") hasCoveredNeighbor = true;
          if (other.enclosure === "outdoor" || other.enclosure === "semi_covered") {
            touchesOutdoor = true;
          }
        }
      }

      if (hasCoveredNeighbor) continue;

      if (enclosure === "outdoor") {
        segments.push({
          ...edge,
          kind: "exterior",
          dashed: true,
        });
        continue;
      }

      if (enclosure === "covered" || enclosure === "semi_covered") {
        segments.push({
          ...edge,
          kind: "exterior",
          dashed: enclosure === "semi_covered" || touchesOutdoor,
        });
      }
    }
  }

  return segments.map((seg, index) => ({
    ...seg,
    debugId: `${seg.kind === "exterior" ? "ext" : "int"}-${index}`,
  }));
}

export function wallOpeningCoords(
  zone: RenderZone,
  wall: WallSide,
  position: number,
  span: number,
): { cx: number; cy: number; x1: number; y1: number; x2: number; y2: number } {
  const t = Math.max(0.08, Math.min(0.92, position / 100));
  const half = span / 2;
  let cx = zone.x + zone.width * t;
  let cy = zone.y + zone.height * t;

  if (wall === "top") {
    cy = zone.y;
    return { cx, cy, x1: cx - half, y1: cy, x2: cx + half, y2: cy };
  }
  if (wall === "bottom") {
    cy = zone.y + zone.height;
    return { cx, cy, x1: cx - half, y1: cy, x2: cx + half, y2: cy };
  }
  if (wall === "left") {
    cx = zone.x;
    return { cx, cy, x1: cx, y1: cy - half, x2: cx, y2: cy + half };
  }
  cx = zone.x + zone.width;
  return { cx, cy, x1: cx, y1: cy - half, x2: cx, y2: cy + half };
}

function isPatioConnection(door: RenderDoor, zones: RenderZone[]): boolean {
  const a = findZone(zones, door.from);
  const b = findZone(zones, door.to);
  if (
    (a && isOutdoorSpace(a.type)) ||
    (b && isOutdoorSpace(b.type)) ||
    /PATIO/i.test(door.from) ||
    /PATIO/i.test(door.to)
  ) {
    return true;
  }
  return false;
}

function openingSpan(
  door: RenderDoor,
  zone: RenderZone,
  _zones: RenderZone[],
  patio: boolean,
): number {
  const wallLen =
    door.wall === "left" || door.wall === "right" ? zone.height : zone.width;

  if (door.type === "open_passage") {
    if (patio) {
      return Math.max(7, Math.min(wallLen * 0.52, Math.max(door.width * 0.38, 10)));
    }
    return Math.max(2.8, Math.min(wallLen * 0.32, door.width * 0.22));
  }

  if (door.type === "sliding") {
    if (patio) {
      return Math.max(6, Math.min(wallLen * 0.48, door.width * 0.32));
    }
    return Math.max(2.4, Math.min(wallLen * 0.3, door.width * 0.22));
  }

  return Math.max(1.3, Math.min(patio ? 3.8 : 2.8, door.width * 0.2));
}

function hingedSwing(
  wall: WallSide,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  span: number,
  swingInward: boolean,
): { hingeX: number; hingeY: number; leafX: number; leafY: number; arcD: string } {
  const r = Math.min(span * 0.85, span);
  let hingeX = x1;
  let hingeY = y1;
  let leafX = x1;
  let leafY = y1;
  let arcD = "";

  switch (wall) {
    case "bottom":
      hingeX = swingInward ? x1 : x2;
      hingeY = cy;
      leafY = cy - r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 ${swingInward ? 0 : 1} ${hingeX} ${leafY}`;
      leafX = hingeX;
      break;
    case "top":
      hingeX = swingInward ? x2 : x1;
      hingeY = cy;
      leafY = cy + r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 ${swingInward ? 1 : 0} ${hingeX} ${leafY}`;
      leafX = hingeX;
      break;
    case "right":
      hingeX = cx;
      hingeY = swingInward ? y2 : y1;
      leafX = cx - r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 ${swingInward ? 1 : 0} ${leafX} ${hingeY}`;
      leafY = hingeY;
      break;
    case "left":
      hingeX = cx;
      hingeY = swingInward ? y1 : y2;
      leafX = cx + r;
      arcD = `M ${hingeX} ${hingeY} A ${r} ${r} 0 0 ${swingInward ? 0 : 1} ${leafX} ${hingeY}`;
      leafY = hingeY;
      break;
  }

  return { hingeX, hingeY, leafX, leafY, arcD };
}

export function buildOpenings(
  plan: GeneratedPlan,
): PlanOpening[] {
  const zones = plan.zones;
  const out: PlanOpening[] = [];

  for (const door of plan.doors ?? []) {
    const zone = findZone(zones, door.from) ?? findZone(zones, door.to);
    if (!zone) continue;

    const patio = isPatioConnection(door, zones);
    const toZone = findZone(zones, door.to) ?? findZone(zones, door.from);
    const fromZone = findZone(zones, door.from) ?? zone;
    const span = openingSpan(door, zone, zones, patio);

    const { cx, cy, x1, y1, x2, y2 } = wallOpeningCoords(
      zone,
      door.wall,
      door.position,
      span,
    );

    const connectsOutdoor = patio;
    const connectsSemiOutdoor =
      toZone?.type === "semi_outdoor" || fromZone?.type === "semi_outdoor";

    let kind: PlanOpening["kind"] = "hinged";
    if (door.type === "open_passage") {
      kind = patio ? "wide_sliding" : "passage";
    } else if (door.type === "sliding") {
      kind = patio ? "wide_sliding" : "sliding";
    }

    const swingInward = !connectsOutdoor;
    const swing = kind === "hinged"
      ? hingedSwing(door.wall, cx, cy, x1, y1, x2, y2, span, swingInward)
      : { hingeX: x1, hingeY: y1, leafX: x1, leafY: y1, arcD: "" };

    out.push({
      id: door.id,
      kind,
      wall: door.wall,
      x1,
      y1,
      x2,
      y2,
      hingeX: swing.hingeX,
      hingeY: swing.hingeY,
      leafX: swing.leafX,
      leafY: swing.leafY,
      swingRadius: span * 0.85,
      swingArcD: swing.arcD,
      connectsOutdoor,
      connectsSemiOutdoor,
    });
  }

  return out;
}

function windowLength(
  size: RenderWindow["size"],
  wallSpan: number,
): number {
  const mult = size === "large" ? 1.35 : size === "medium" ? 1.05 : 0.82;
  return Math.max(1.4, Math.min(wallSpan * 0.22, 2.8 * mult));
}

export function buildWindows(plan: GeneratedPlan): PlanWindow[] {
  const out: PlanWindow[] = [];
  for (const win of plan.windows ?? []) {
    const zone = findZone(plan.zones, win.zoneId);
    if (!zone) continue;

    const wallLen =
      win.wall === "left" || win.wall === "right" ? zone.height : zone.width;
    const len = windowLength(win.size, wallLen);
    const t = Math.max(0.12, Math.min(0.88, win.position / 100));
    const inset = 0.12;
    const glassOffset = 0.24;

    let x1 = 0,
      y1 = 0,
      x2 = 0,
      y2 = 0,
      ix1 = 0,
      iy1 = 0,
      ix2 = 0,
      iy2 = 0;

    if (win.wall === "top") {
      const y = zone.y + inset;
      x1 = zone.x + zone.width * t - len / 2;
      x2 = x1 + len;
      y1 = y2 = y;
      iy1 = iy2 = y + glassOffset;
      ix1 = x1;
      ix2 = x2;
    } else if (win.wall === "bottom") {
      const y = zone.y + zone.height - inset;
      x1 = zone.x + zone.width * t - len / 2;
      x2 = x1 + len;
      y1 = y2 = y;
      iy1 = iy2 = y - glassOffset;
      ix1 = x1;
      ix2 = x2;
    } else if (win.wall === "left") {
      const x = zone.x + inset;
      y1 = zone.y + zone.height * t - len / 2;
      y2 = y1 + len;
      x1 = x2 = x;
      ix1 = ix2 = x + glassOffset;
      iy1 = y1;
      iy2 = y2;
    } else {
      const x = zone.x + zone.width - inset;
      y1 = zone.y + zone.height * t - len / 2;
      y2 = y1 + len;
      x1 = x2 = x;
      ix1 = ix2 = x - glassOffset;
      iy1 = y1;
      iy2 = y2;
    }

    out.push({ id: win.id, wall: win.wall, x1, y1, x2, y2, ix1, iy1, ix2, iy2 });
  }
  return out;
}

/** Split wall segment around opening gap (axis-aligned). */
export function splitWallForOpening(
  seg: WallSegment,
  ox1: number,
  oy1: number,
  ox2: number,
  oy2: number,
  gapPad = 0.15,
): WallSegment[] {
  const horizontal = Math.abs(seg.y1 - seg.y2) < 0.01;
  const gx1 = Math.min(ox1, ox2) - gapPad;
  const gx2 = Math.max(ox1, ox2) + gapPad;

  if (horizontal) {
    const y = seg.y1;
    const sx1 = Math.min(seg.x1, seg.x2);
    const sx2 = Math.max(seg.x1, seg.x2);
    const parts: WallSegment[] = [];
    if (gx1 > sx1 + 0.2) {
      parts.push({ x1: sx1, y1: y, x2: gx1, y2: y, kind: seg.kind, dashed: seg.dashed });
    }
    if (gx2 < sx2 - 0.2) {
      parts.push({ x1: gx2, y1: y, x2: sx2, y2: y, kind: seg.kind, dashed: seg.dashed });
    }
    return parts.length ? parts : [];
  }

  const vertical = Math.abs(seg.x1 - seg.x2) < 0.01;
  if (vertical) {
    const x = seg.x1;
    const sy1 = Math.min(seg.y1, seg.y2);
    const sy2 = Math.max(seg.y1, seg.y2);
    const gy1 = Math.min(oy1, oy2) - gapPad;
    const gy2 = Math.max(oy1, oy2) + gapPad;
    const parts: WallSegment[] = [];
    if (gy1 > sy1 + 0.2) {
      parts.push({ x1: x, y1: sy1, x2: x, y2: gy1, kind: seg.kind, dashed: seg.dashed });
    }
    if (gy2 < sy2 - 0.2) {
      parts.push({ x1: x, y1: gy2, x2: x, y2: sy2, kind: seg.kind, dashed: seg.dashed });
    }
    return parts.length ? parts : [];
  }

  return [seg];
}

export function computePlanLayout(rooms: PlanRoom[]): PlanLayout {
  if (!rooms.length) {
    return {
      sheetWidth: SHEET.width,
      sheetHeight: SHEET.height,
      planAreaX: SHEET.margin,
      planAreaY: SHEET.margin,
      planAreaW: SHEET.width - SHEET.margin * 2,
      planAreaH: SHEET.height - SHEET.titleBlockH - SHEET.margin * 1.5,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const minX = Math.min(...rooms.map((r) => r.x));
  const minY = Math.min(...rooms.map((r) => r.y));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width));
  const maxY = Math.max(...rooms.map((r) => r.y + r.height));

  const planAreaX = SHEET.margin;
  const planAreaY = SHEET.margin;
  const planAreaW = SHEET.width - SHEET.margin * 2;
  const planAreaH =
    SHEET.height - SHEET.titleBlockH - SHEET.margin - SHEET.planPad;

  const bboxW = maxX - minX + SHEET.planPad * 2;
  const bboxH = maxY - minY + SHEET.planPad * 2;
  const scale = Math.min(planAreaW / bboxW, planAreaH / bboxH);

  const contentW = bboxW * scale;
  const contentH = bboxH * scale;
  const offsetX =
    planAreaX + (planAreaW - contentW) / 2 - (minX - SHEET.planPad) * scale;
  const offsetY =
    planAreaY + (planAreaH - contentH) / 2 - (minY - SHEET.planPad) * scale;

  return {
    sheetWidth: SHEET.width,
    sheetHeight: SHEET.height,
    planAreaX,
    planAreaY,
    planAreaW,
    planAreaH,
    scale,
    offsetX,
    offsetY,
  };
}

export function transformPoint(
  layout: PlanLayout,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: x * layout.scale + layout.offsetX,
    y: y * layout.scale + layout.offsetY,
  };
}

export function planTransformAttr(layout: PlanLayout): string {
  return `translate(${layout.offsetX} ${layout.offsetY}) scale(${layout.scale})`;
}
