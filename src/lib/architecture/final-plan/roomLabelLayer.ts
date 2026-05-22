import type { GeneratedPlan } from "../generatedPlan";
import type {
  PlanFurniture,
  PlanLabel,
  PlanOpening,
  PlanRoom,
  PlanWindow,
} from "./types";
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

function furnitureObstacles(furniture: PlanFurniture[]): Obstacle[] {
  return furniture.map((f) => ({
    x1: f.x - 0.25,
    y1: f.y - 0.25,
    x2: f.x + f.width + 0.25,
    y2: f.y + f.height + 0.25,
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
    ? Math.max(0.76, Math.min(0.9, minDim * 0.22))
    : compact
      ? Math.max(0.8, Math.min(1.05, minDim * 0.09))
      : Math.max(0.86, Math.min(1.18, minDim * 0.058));
  const areaSize = Math.max(0.65, Math.min(0.88, nameSize * 0.58));
  const showArea =
    room.areaM2 != null && minDim >= (callout ? 4.4 : 5.8);

  return { nameSize, areaSize, showArea, callout };
}

export function buildRoomLabels(
  rooms: PlanRoom[],
  openings: PlanOpening[],
  windows: PlanWindow[],
  _plan: GeneratedPlan,
  furniture: PlanFurniture[] = [],
): PlanLabel[] {
  const obstacles = [
    ...openingObstacles(openings),
    ...windowObstacles(windows),
    ...furnitureObstacles(furniture),
  ];
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
