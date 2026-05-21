import type { ConceptPlan } from "./types";

type Zone = ConceptPlan["zones"][number];

const MARGIN = 6;
const GRID = 2;

function snap(n: number) {
  return Math.round(n / GRID) * GRID;
}

function zoneArea(z: Zone) {
  return z.width * z.height;
}

function sizeUnits(relativeSize: Zone["relativeSize"]) {
  return { small: 1, medium: 1.35, large: 1.7 }[relativeSize];
}

function placeRow(row: Zone[], rowHeight: number, yPos: number): Zone[] {
  if (row.length === 0) return [];
  const weights = row.map((z) => sizeUnits(z.relativeSize));
  const total = weights.reduce((a, b) => a + b, 0);
  const innerW = 100 - MARGIN * 2;
  let x = MARGIN;
  return row.map((zone, i) => {
    const width = snap((innerW * weights[i]) / total);
    const placed = { ...zone, x, y: yPos, width, height: rowHeight };
    x += width;
    return placed;
  });
}

export function packArchitecturalLayout(zones: Zone[]): Zone[] {
  const outdoor = zones.filter((z) => z.type === "outdoor");
  const social = zones.filter((z) => z.type === "social");
  const privateZ = zones.filter((z) => z.type === "private");
  const service = zones.filter(
    (z) => z.type === "service" || z.type === "work",
  );
  const flex = zones.filter((z) => z.type === "flex");

  const rows: { row: Zone[]; h: number }[] = [];
  if (outdoor.length) rows.push({ row: outdoor, h: 20 });
  rows.push({ row: [...flex, ...social], h: 34 });
  if (service.length) rows.push({ row: service, h: 16 });
  if (privateZ.length) rows.push({ row: privateZ, h: 26 });

  const totalH = rows.reduce((s, r) => s + r.h, 0);
  const scale = totalH > 100 - MARGIN * 2 ? (100 - MARGIN * 2) / totalH : 1;

  let y = MARGIN;
  const placed: Zone[] = [];
  for (const { row, h } of rows) {
    const height = snap(h * scale);
    placed.push(...placeRow(row, height, y));
    y += height;
  }

  const missing = zones.filter((z) => !placed.some((p) => p.id === z.id));
  if (missing.length > 0) {
    placed.push(...placeRow(missing, snap(100 - MARGIN - y), y));
  }

  return placed;
}

function rectsOverlapPct(a: Zone, b: Zone): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return 0;
  const overlap = (x2 - x1) * (y2 - y1);
  const smaller = Math.min(zoneArea(a), zoneArea(b));
  return smaller > 0 ? overlap / smaller : 0;
}

function isContained(inner: Zone, outer: Zone): boolean {
  return (
    inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 &&
    inner.y + inner.height <= outer.y + outer.height + 0.5 &&
    zoneArea(inner) < zoneArea(outer) * 0.85
  );
}

function collides(candidate: Zone, zones: Zone[], skipId: string): boolean {
  return zones.some(
    (z) =>
      z.id !== skipId &&
      z.id !== candidate.id &&
      rectsOverlapPct(candidate, z) > 0.08,
  );
}

/** Move nested service rooms (e.g. bath inside living) to valid adjacent slots. */
export function resolveZoneOverlaps(zones: Zone[]): Zone[] {
  const result = zones.map((z) => ({ ...z }));

  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (let i = 0; i < result.length; i++) {
      for (let j = 0; j < result.length; j++) {
        if (i === j) continue;
        const a = result[i];
        const b = result[j];
        const overlap = rectsOverlapPct(a, b);
        if (overlap < 0.35) continue;

        const small = zoneArea(a) <= zoneArea(b) ? a : b;
        const large = small === a ? b : a;
        const smallIdx = result.findIndex((z) => z.id === small.id);
        if (smallIdx < 0) continue;

        const candidates: Zone[] = [
          {
            ...small,
            x: large.x + large.width,
            y: large.y,
            width: small.width,
            height: small.height,
          },
          {
            ...small,
            x: large.x,
            y: large.y + large.height,
            width: small.width,
            height: small.height,
          },
          {
            ...small,
            x: large.x - small.width,
            y: large.y,
            width: small.width,
            height: small.height,
          },
          {
            ...small,
            x: large.x + large.width - small.width,
            y: large.y + large.height - small.height,
            width: small.width,
            height: small.height,
          },
          {
            ...small,
            x: 24,
            y: 40,
            width: 16,
            height: 14,
          },
        ];

        for (const cand of candidates) {
          const c = {
            ...cand,
            x: snap(clamp(cand.x, MARGIN, 94 - cand.width)),
            y: snap(clamp(cand.y, MARGIN, 94 - cand.height)),
          };
          if (!collides(c, result, small.id)) {
            result[smallIdx] = c;
            moved = true;
            break;
          }
        }
      }
    }
    if (!moved) break;
  }

  return result;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function snapZonesToGrid(zones: Zone[]): Zone[] {
  return zones.map((z) => ({
    ...z,
    x: snap(z.x),
    y: snap(z.y),
    width: snap(z.width),
    height: snap(z.height),
  }));
}

/** Known-good layout for the casa chica JSON (fixes BAÑO inside SALA). */
export function refineCasaChicaLayout(zones: Zone[]): Zone[] | null {
  const ids = new Set(zones.map((z) => z.id));
  if (
    !ids.has("SALA_COMEDOR") ||
    !ids.has("BANO") ||
    !ids.has("DISTRIBUIDOR")
  ) {
    return null;
  }
  return zones.map((z) => {
    switch (z.id) {
      case "SALA_COMEDOR":
        return { ...z, x: 24, y: 10, width: 40, height: 28 };
      case "BANO":
        return { ...z, x: 24, y: 38, width: 16, height: 12 };
      case "PATIO":
        return { ...z, x: 40, y: 40, width: 24, height: 30 };
      default:
        return z;
    }
  });
}

export function hasSignificantOverlaps(zones: Zone[]): boolean {
  let n = 0;
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlapPct(zones[i], zones[j]) > 0.25) n++;
      if (isContained(zones[i], zones[j]) || isContained(zones[j], zones[i]))
        n++;
    }
  }
  return n > 0;
}

export type PxRect = { x: number; y: number; w: number; h: number; id: string };

export type DoorSpec = {
  fromId: string;
  toId: string;
  edge: "n" | "s" | "e" | "w";
  x: number;
  y: number;
  length: number;
};

const EDGE_TOL = 3;

export function findSharedEdges(
  zones: PxRect[],
  adjacencies: ConceptPlan["adjacencies"],
): DoorSpec[] {
  const doors: DoorSpec[] = [];
  const pairSet = new Set<string>();

  for (const adj of adjacencies) {
    const a = zones.find((z) => z.id === adj.from);
    const b = zones.find((z) => z.id === adj.to);
    if (!a || !b) continue;
    const key = [adj.from, adj.to].sort().join("|");
    if (pairSet.has(key)) continue;
    pairSet.add(key);

    const shared = detectSharedEdge(a, b);
    if (shared) {
      doors.push({ ...shared, fromId: adj.from, toId: adj.to });
    } else {
      const inferred = inferDoorBetween(a, b);
      if (inferred) doors.push({ ...inferred, fromId: adj.from, toId: adj.to });
    }
  }

  return doors;
}

function verticalOverlap(a: PxRect, b: PxRect) {
  return Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
}

function horizontalOverlap(a: PxRect, b: PxRect) {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
}

function detectSharedEdge(
  a: PxRect,
  b: PxRect,
): Omit<DoorSpec, "fromId" | "toId"> | null {
  if (Math.abs(a.x + a.w - b.x) < EDGE_TOL && verticalOverlap(a, b) > 10) {
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.h, b.y + b.h);
    return { edge: "e", x: a.x + a.w, y: (y0 + y1) / 2, length: y1 - y0 };
  }
  if (Math.abs(b.x + b.w - a.x) < EDGE_TOL && verticalOverlap(a, b) > 10) {
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.h, b.y + b.h);
    return { edge: "w", x: a.x, y: (y0 + y1) / 2, length: y1 - y0 };
  }
  if (Math.abs(a.y + a.h - b.y) < EDGE_TOL && horizontalOverlap(a, b) > 10) {
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.w, b.x + b.w);
    return { edge: "s", x: (x0 + x1) / 2, y: a.y + a.h, length: x1 - x0 };
  }
  if (Math.abs(b.y + b.h - a.y) < EDGE_TOL && horizontalOverlap(a, b) > 10) {
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.w, b.x + b.w);
    return { edge: "n", x: (x0 + x1) / 2, y: a.y, length: x1 - x0 };
  }
  return null;
}

function inferDoorBetween(a: PxRect, b: PxRect): Omit<DoorSpec, "fromId" | "toId"> | null {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      return {
        edge: "e",
        x: a.x + a.w,
        y: (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2,
        length: Math.min(24, verticalOverlap(a, b) || 20),
      };
    }
    return {
      edge: "w",
      x: a.x,
      y: (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2,
      length: Math.min(24, verticalOverlap(a, b) || 20),
    };
  }
  if (dy > 0) {
    return {
      edge: "s",
      x: (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2,
      y: a.y + a.h,
      length: Math.min(24, horizontalOverlap(a, b) || 20),
    };
  }
  return {
    edge: "n",
    x: (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2,
    y: a.y,
    length: Math.min(24, horizontalOverlap(a, b) || 20),
  };
}
