import type { ProgramZoneType, TopologyEdge } from "@/lib/architectural-program/types";
import type { WallOpening, WallSide } from "@/lib/floor-plan/types";
import type { FloorplanLayoutResult, PlacedZoneRect } from "@/lib/floorplan-layout/types";
import {
  cutOpeningInWall,
  drawDoorOpen90,
  drawOpenPassage,
  drawSlidingDoor,
} from "./architectural-symbols";
import { ZONE_FILL_BY_TYPE } from "./render-base-floorplan";
import {
  findSharedWall,
  type SharedWallSegment,
} from "./shared-wall-geometry";

const DOOR_RELATIONS = new Set([
  "direct_access",
  "transition_door",
  "private_door",
  "service_door",
  "visual_and_physical",
]);

const OPEN_PASSAGE_RELATIONS = new Set(["open_concept", "service_flow"]);

const WALL_CUT_WIDTH = 16;
const DEFAULT_DOOR_SPAN = 34;
const MIN_DOOR_SPAN = 26;
const MAX_DOOR_SPAN = 52;
const DOUBLE_DOOR_MIN = 44;

const PRIVACY_PRIORITY: Record<ProgramZoneType, number> = {
  private: 5,
  circulation: 3,
  social: 2,
  service: 1,
  outdoor: 0,
};

export type DoorRenderKind =
  | "swing_single"
  | "swing_double"
  | "sliding"
  | "open_passage";

export type DrawSmartOpeningsOptions = {
  doorSpanPx?: number;
};

function fillForType(type: ProgramZoneType): string {
  return ZONE_FILL_BY_TYPE[type] ?? "#f1f5f9";
}

function doorSpanForSegment(
  seg: SharedWallSegment,
  override?: number,
): number {
  const base = override ?? DEFAULT_DOOR_SPAN;
  return Math.min(
    MAX_DOOR_SPAN,
    Math.max(MIN_DOOR_SPAN, Math.min(base, seg.length * 0.45)),
  );
}

function classifyDoorKind(
  edge: TopologyEdge,
  a: PlacedZoneRect,
  b: PlacedZoneRect,
  span: number,
): DoorRenderKind {
  if (OPEN_PASSAGE_RELATIONS.has(edge.relation)) return "open_passage";

  const involvesPatio = a.type === "outdoor" || b.type === "outdoor";
  const involvesSocial = a.type === "social" || b.type === "social";

  if (
    involvesPatio &&
    involvesSocial &&
    (edge.relation === "visual_and_physical" || edge.strength !== "critical")
  ) {
    return "sliding";
  }

  if (span >= DOUBLE_DOOR_MIN && involvesSocial) return "swing_double";

  return "swing_single";
}

function wallOpeningAt(
  zone: PlacedZoneRect,
  wall: WallSide,
  centerX: number,
  centerY: number,
  span: number,
): WallOpening {
  const along = wall === "top" || wall === "bottom" ? "h" : "v";
  return { centerX, centerY, span, wall, along };
}

function cutWallOpening(
  ctx: CanvasRenderingContext2D,
  seg: SharedWallSegment,
  span: number,
  maskColor: string,
): void {
  const half = span / 2 + 2;
  ctx.save();
  ctx.strokeStyle = maskColor;
  ctx.lineWidth = WALL_CUT_WIDTH;
  ctx.lineCap = "butt";
  ctx.beginPath();
  if (seg.orientation === "horizontal") {
    ctx.moveTo(seg.centerX - half, seg.centerY);
    ctx.lineTo(seg.centerX + half, seg.centerY);
  } else {
    ctx.moveTo(seg.centerX, seg.centerY - half);
    ctx.lineTo(seg.centerX, seg.centerY + half);
  }
  ctx.stroke();
  ctx.restore();
}

function pickSwingTarget(
  a: PlacedZoneRect,
  b: PlacedZoneRect,
): { into: PlacedZoneRect; wall: WallSide } {
  const pa = PRIVACY_PRIORITY[a.type];
  const pb = PRIVACY_PRIORITY[b.type];
  const into = pa >= pb ? a : b;
  const shared = findSharedWall(a, b);
  if (!shared) return { into, wall: "bottom" };
  return {
    into,
    wall: into.id === a.id ? shared.sideOnA : shared.sideOnB,
  };
}

function passingRoomFill(a: PlacedZoneRect, b: PlacedZoneRect): string {
  return PRIVACY_PRIORITY[a.type] <= PRIVACY_PRIORITY[b.type]
    ? fillForType(a.type)
    : fillForType(b.type);
}

function drawDoorByKind(
  ctx: CanvasRenderingContext2D,
  kind: DoorRenderKind,
  seg: SharedWallSegment,
  span: number,
  a: PlacedZoneRect,
  b: PlacedZoneRect,
): void {
  if (kind === "open_passage") {
    const op = wallOpeningAt(a, "bottom", seg.centerX, seg.centerY, span);
    drawOpenPassage(ctx, op);
    return;
  }

  if (kind === "sliding") {
    const social = a.type === "social" ? a : b.type === "social" ? b : a;
    const shared = findSharedWall(a, b)!;
    const wall =
      social.id === a.id ? shared.sideOnA : shared.sideOnB;
    const op = wallOpeningAt(social, wall, seg.centerX, seg.centerY, span);
    drawSlidingDoor(ctx, op);
    return;
  }

  const { into, wall } = pickSwingTarget(a, b);

  if (kind === "swing_double") {
    const half = span / 2 - 2;
    const op1 = wallOpeningAt(into, wall, seg.centerX - half / 2, seg.centerY, half);
    const op2 = wallOpeningAt(into, wall, seg.centerX + half / 2, seg.centerY, half);
    drawDoorOpen90(ctx, op1);
    drawDoorOpen90(ctx, op2);
    return;
  }

  const op = wallOpeningAt(into, wall, seg.centerX, seg.centerY, span);
  drawDoorOpen90(ctx, op);
}

function processDoorEdge(
  ctx: CanvasRenderingContext2D,
  edge: TopologyEdge,
  byId: Map<string, PlacedZoneRect>,
  doorSpanDefault?: number,
): void {
  const a = byId.get(edge.from);
  const b = byId.get(edge.to);
  if (!a || !b) return;

  const shared = findSharedWall(a, b);
  if (!shared || shared.length < MIN_DOOR_SPAN) return;

  const span = doorSpanForSegment(shared, doorSpanDefault);
  const kind = classifyDoorKind(edge, a, b, span);

  if (
    !OPEN_PASSAGE_RELATIONS.has(edge.relation) &&
    !DOOR_RELATIONS.has(edge.relation) &&
    kind !== "sliding"
  ) {
    return;
  }

  const mask = passingRoomFill(a, b);
  cutWallOpening(ctx, shared, span + (kind === "open_passage" ? 8 : 0), mask);
  drawDoorByKind(ctx, kind, shared, span, a, b);
}

/**
 * Puertas profesionales: batiente, doble, corrediza patio, paso abierto.
 * Ventanas: ver `drawWindowsSystem`.
 */
export function drawSmartOpenings(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  topologyGraph: TopologyEdge[],
  options: DrawSmartOpeningsOptions = {},
): void {
  const byId = new Map(layout.zones.map((z) => [z.id, z]));

  try {
    const seen = new Set<string>();

    for (const edge of topologyGraph) {
      const key = [edge.from, edge.to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);

      processDoorEdge(ctx, edge, byId, options.doorSpanPx);
    }
  } finally {
    ctx.setLineDash([]);
  }
}
