import type { GeneratedPlan } from "../generatedPlan";
import type { PlanLabel, PlanOpening, PlanRoom, PlanWindow } from "./types";
import { formatAreaM2 } from "./planGeometryUtils";

type Obstacle = { x1: number; y1: number; x2: number; y2: number };

function box(cx: number, cy: number, w: number, h: number): Obstacle {
  return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
}

function overlaps(a: Obstacle, b: Obstacle, pad = 0.35): boolean {
  return !(
    a.x2 + pad < b.x1 ||
    a.x1 - pad > b.x2 ||
    a.y2 + pad < b.y1 ||
    a.y1 - pad > b.y2
  );
}

function openingObstacles(openings: PlanOpening[]): Obstacle[] {
  return openings.map((o) => {
    const pad = o.kind === "wide_sliding" ? 1.2 : 0.7;
    return {
      x1: Math.min(o.x1, o.x2) - pad,
      y1: Math.min(o.y1, o.y2) - pad,
      x2: Math.max(o.x1, o.x2) + pad,
      y2: Math.max(o.y1, o.y2) + pad,
    };
  });
}

function windowObstacles(windows: PlanWindow[]): Obstacle[] {
  return windows.map((w) => ({
    x1: Math.min(w.x1, w.x2, w.ix1, w.ix2) - 0.5,
    y1: Math.min(w.y1, w.y2, w.iy1, w.iy2) - 0.5,
    x2: Math.max(w.x1, w.x2, w.ix1, w.ix2) + 0.5,
    y2: Math.max(w.y1, w.y2, w.iy1, w.iy2) + 0.5,
  }));
}

function labelSizes(room: PlanRoom): {
  nameSize: number;
  areaSize: number;
  showArea: boolean;
  callout: boolean;
} {
  const minDim = Math.min(room.width, room.height);
  if (minDim < 2.2) {
    return { nameSize: 0, areaSize: 0, showArea: false, callout: false };
  }

  const callout = minDim < 3.6;
  const compact = minDim < 6;
  const nameSize = callout
    ? Math.max(0.9, Math.min(1.1, minDim * 0.28))
    : compact
      ? Math.max(1, Math.min(1.35, minDim * 0.12))
      : Math.max(1.08, Math.min(1.52, minDim * 0.075));
  const areaSize = Math.max(0.8, Math.min(1.15, nameSize * 0.68));
  const showArea =
    room.areaM2 != null && minDim >= (callout ? 4 : 5);

  return { nameSize, areaSize, showArea, callout };
}

export function buildRoomLabels(
  rooms: PlanRoom[],
  openings: PlanOpening[],
  windows: PlanWindow[],
  _plan: GeneratedPlan,
): PlanLabel[] {
  const obstacles = [...openingObstacles(openings), ...windowObstacles(windows)];
  const placed: Obstacle[] = [];
  const labels: PlanLabel[] = [];

  const sorted = [...rooms].sort(
    (a, b) => b.width * b.height - a.width * a.height,
  );

  for (const room of sorted) {
    const { nameSize, areaSize, showArea, callout } = labelSizes(room);
    if (nameSize <= 0) continue;

    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;
    const lineGap = showArea ? nameSize * 0.5 : 0;
    const offsets = callout
      ? [
          { dx: 0, dy: 0 },
          { dx: 0, dy: -room.height * 0.15 },
          { dx: room.width * 0.12, dy: 0 },
        ]
      : [
          { dx: 0, dy: 0 },
          { dx: 0, dy: -0.8 },
          { dx: 0, dy: 0.8 },
          { dx: -0.8, dy: 0 },
          { dx: 0.8, dy: 0 },
        ];

    let chosen: { x: number; y: number; nameY: number; areaY: number } | null =
      null;

    for (const { dx, dy } of offsets) {
      const x = cx + dx;
      const nameY = cy - lineGap + dy;
      const areaY = nameY + nameSize * 0.95;
      const w = Math.max(room.displayName.length * nameSize * 0.38, 3);
      const h =
        (showArea ? nameSize + areaSize : nameSize) * 1.1 + lineGap;
      const candidate = box(x, (nameY + (showArea ? areaY : nameY)) / 2, w, h);

      const hitsObstacle = obstacles.some((o) => overlaps(candidate, o));
      const hitsLabel = placed.some((p) => overlaps(candidate, p));
      if (!hitsObstacle && !hitsLabel) {
        chosen = { x, nameY, areaY };
        placed.push(candidate);
        break;
      }
    }

    if (!chosen) {
      chosen = {
        x: cx,
        nameY: cy - lineGap,
        areaY: cy - lineGap + nameSize * 0.95,
      };
    }

    labels.push({
      roomId: room.id,
      name: room.displayName,
      areaText:
        showArea && room.areaM2 != null
          ? formatAreaM2(room.areaM2)
          : null,
      x: chosen.x,
      y: cy,
      nameY: chosen.nameY,
      areaY: chosen.areaY,
      nameSize,
      areaSize,
      callout,
    });
  }

  return labels;
}
