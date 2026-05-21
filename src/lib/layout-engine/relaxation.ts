import {
  ADJACENCY_GAP,
  aspectRatio,
  clampRectToLot,
  enforceAspectRatio,
  rectCenter,
  rectsOverlap,
} from "./geometry";
import type {
  ConstraintAdjacency,
  ConstraintLot,
  PlacedZone,
} from "./types";

const PULL = 0.42;
const SEPARATE = 0.55;
const DAMPING = 0.85;

function gapBetween(a: PlacedZone, b: PlacedZone): {
  dx: number;
  dy: number;
  touch: boolean;
} {
  const gapR = b.x - (a.x + a.w);
  const gapL = a.x - (b.x + b.w);
  const gapB = b.y - (a.y + a.h);
  const gapT = a.y - (b.y + b.h);

  const overlapX =
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY =
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);

  if (overlapX > ADJACENCY_GAP && overlapY > ADJACENCY_GAP) {
    return { dx: 0, dy: 0, touch: true };
  }

  let dx = 0;
  let dy = 0;

  if (overlapX > 0 && overlapY <= 0) {
    dy =
      gapB < gapT
        ? -(overlapY + ADJACENCY_GAP)
        : overlapY + ADJACENCY_GAP;
  } else if (overlapY > 0 && overlapX <= 0) {
    dx =
      gapR < gapL
        ? -(overlapX + ADJACENCY_GAP)
        : overlapX + ADJACENCY_GAP;
  } else {
    const minH = Math.min(Math.abs(gapR), Math.abs(gapL));
    const minV = Math.min(Math.abs(gapB), Math.abs(gapT));
    if (minH < minV) {
      dx = gapR < gapL ? gapR - ADJACENCY_GAP : -(gapL + ADJACENCY_GAP);
    } else {
      dy = gapB < gapT ? gapB - ADJACENCY_GAP : -(gapT + ADJACENCY_GAP);
    }
  }

  const touch =
    Math.abs(gapR) < ADJACENCY_GAP ||
    Math.abs(gapL) < ADJACENCY_GAP ||
    Math.abs(gapB) < ADJACENCY_GAP ||
    Math.abs(gapT) < ADJACENCY_GAP;

  return { dx, dy, touch };
}

function adjacencyPull(a: PlacedZone, b: PlacedZone): { dx: number; dy: number } {
  const { dx, dy, touch } = gapBetween(a, b);
  if (touch) return { dx: 0, dy: 0 };
  return { dx: -dx * PULL, dy: -dy * PULL };
}

function separateOverlap(a: PlacedZone, b: PlacedZone): { ax: number; ay: number; bx: number; by: number } {
  const overlapX =
    Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY =
    Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (overlapX <= 0 || overlapY <= 0) return { ax: 0, ay: 0, bx: 0, by: 0 };

  const ac = rectCenter(a);
  const bc = rectCenter(b);

  if (overlapX < overlapY) {
    const shift = (overlapX / 2) * SEPARATE;
    return ac.cx < bc.cx
      ? { ax: -shift, ay: 0, bx: shift, by: 0 }
      : { ax: shift, ay: 0, bx: -shift, by: 0 };
  }
  const shift = (overlapY / 2) * SEPARATE;
  return ac.cy < bc.cy
    ? { ax: 0, ay: -shift, bx: 0, by: shift }
    : { ax: 0, ay: shift, bx: 0, by: -shift };
}

export type RelaxationResult = {
  zones: PlacedZone[];
  overlapCount: number;
  adjacencySatisfied: number;
};

export function relaxLayout(
  zones: PlacedZone[],
  adjacencies: ConstraintAdjacency[],
  lot: ConstraintLot,
  iterations: number,
): RelaxationResult {
  const state = zones.map((z) => ({ ...z }));
  const byId = () => new Map(state.map((z) => [z.id, z]));

  for (let iter = 0; iter < iterations; iter++) {
    const moves = new Map<string, { dx: number; dy: number }>();
    for (const z of state) moves.set(z.id, { dx: 0, dy: 0 });

    for (const adj of adjacencies) {
      const ids = byId();
      const a = ids.get(adj.from);
      const b = ids.get(adj.to);
      if (!a || !b) continue;
      const { dx, dy } = adjacencyPull(a, b);
      moves.get(a.id)!.dx += dx * 0.5;
      moves.get(a.id)!.dy += dy * 0.5;
      moves.get(b.id)!.dx -= dx * 0.5;
      moves.get(b.id)!.dy -= dy * 0.5;
    }

    for (let i = 0; i < state.length; i++) {
      for (let j = i + 1; j < state.length; j++) {
        const a = state[i];
        const b = state[j];
        if (!rectsOverlap(a, b, 0.5)) continue;
        const sep = separateOverlap(a, b);
        moves.get(a.id)!.dx += sep.ax;
        moves.get(a.id)!.dy += sep.ay;
        moves.get(b.id)!.dx += sep.bx;
        moves.get(b.id)!.dy += sep.by;
      }
    }

    for (const z of state) {
      const m = moves.get(z.id)!;
      z.x += m.dx * DAMPING;
      z.y += m.dy * DAMPING;
      const clamped = clampRectToLot(z, lot);
      Object.assign(z, clamped);
      const arFixed = enforceAspectRatio(z, z.aspectRatioRange);
      Object.assign(z, clampRectToLot(arFixed, lot));
    }
  }

  let overlapCount = 0;
  for (let i = 0; i < state.length; i++) {
    for (let j = i + 1; j < state.length; j++) {
      if (rectsOverlap(state[i], state[j], 0.5)) overlapCount++;
    }
  }

  let adjacencySatisfied = 0;
  for (const adj of adjacencies) {
    const a = state.find((z) => z.id === adj.from);
    const b = state.find((z) => z.id === adj.to);
    if (!a || !b) continue;
    const { touch } = gapBetween(a, b);
    if (touch) adjacencySatisfied++;
  }

  return { zones: state, overlapCount, adjacencySatisfied };
}

export function countAspectViolations(zones: PlacedZone[]): number {
  let n = 0;
  for (const z of zones) {
    const ar = aspectRatio(z);
    if (ar < z.aspectRatioRange[0] || ar > z.aspectRatioRange[1]) n++;
  }
  return n;
}
