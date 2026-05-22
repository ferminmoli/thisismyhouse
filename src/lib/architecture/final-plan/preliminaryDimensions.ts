import type { GeneratedPlan } from "../generatedPlan";
import type { AreaEstimate } from "../planMetadata";
import type { PlanDimension, PlanRoom } from "./types";

export type PreliminaryScale = {
  mPerCanvasUnit: number;
  method: "area_ratio";
};

export type CoveredBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

const MIN_COVERED_CANVAS = 24;
const MIN_M_PER_UNIT = 0.08;
const MAX_M_PER_UNIT = 2.8;
const MIN_BBOX_FILL_RATIO = 0.32;
const MAX_BBOX_FILL_RATIO = 1.05;

export function formatLengthM(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "";
  if (meters >= 10) return `${meters.toFixed(2)} m`;
  return `${meters.toFixed(2)} m`;
}

function coveredRooms(rooms: PlanRoom[]): PlanRoom[] {
  return rooms.filter((r) => r.enclosure === "covered");
}

export function coveredBounds(rooms: PlanRoom[]): CoveredBounds | null {
  const covered = coveredRooms(rooms);
  if (!covered.length) return null;

  const minX = Math.min(...covered.map((r) => r.x));
  const minY = Math.min(...covered.map((r) => r.y));
  const maxX = Math.max(...covered.map((r) => r.x + r.width));
  const maxY = Math.max(...covered.map((r) => r.y + r.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function sumCoveredCanvasUnits(rooms: PlanRoom[]): number {
  return coveredRooms(rooms).reduce((s, r) => s + r.width * r.height, 0);
}

/**
 * Derives m per normalized canvas unit from estimated covered area vs canvas units.
 * Returns null when scale would be misleading.
 */
export function derivePreliminaryScale(
  rooms: PlanRoom[],
  areaEstimate?: AreaEstimate | null,
): PreliminaryScale | null {
  const coveredM2 = areaEstimate?.estimatedCoveredAreaM2;
  if (coveredM2 == null || coveredM2 <= 0) return null;

  let coveredCanvas = areaEstimate?.coveredCanvasUnits ?? 0;
  if (coveredCanvas <= 0) {
    coveredCanvas = sumCoveredCanvasUnits(rooms);
  }
  if (coveredCanvas < MIN_COVERED_CANVAS) return null;

  const bounds = coveredBounds(rooms);
  if (!bounds || bounds.width < 4 || bounds.height < 4) return null;

  const bboxCanvas = bounds.width * bounds.height;
  const fillRatio = coveredCanvas / bboxCanvas;
  if (fillRatio < MIN_BBOX_FILL_RATIO || fillRatio > MAX_BBOX_FILL_RATIO) {
    return null;
  }

  const mPerCanvasUnit = Math.sqrt(coveredM2 / coveredCanvas);
  if (
    !Number.isFinite(mPerCanvasUnit) ||
    mPerCanvasUnit < MIN_M_PER_UNIT ||
    mPerCanvasUnit > MAX_M_PER_UNIT
  ) {
    return null;
  }

  return { mPerCanvasUnit, method: "area_ratio" };
}

function horizontalDimension(
  id: string,
  x1: number,
  x2: number,
  y: number,
  meters: number,
  offset: number,
): PlanDimension | null {
  const label = formatLengthM(meters);
  if (!label || x2 - x1 < 3) return null;
  const dimY = y + offset;
  return {
    id,
    x1,
    y1: dimY,
    x2,
    y2: dimY,
    ext1: { x1, y1: y, x2: x1, y2: dimY },
    ext2: { x1: x2, y1: y, x2, y2: dimY },
    label,
    labelX: (x1 + x2) / 2,
    labelY: dimY,
    rotation: 0,
  };
}

function verticalDimension(
  id: string,
  x: number,
  y1: number,
  y2: number,
  meters: number,
  offset: number,
): PlanDimension | null {
  const label = formatLengthM(meters);
  if (!label || y2 - y1 < 3) return null;
  const dimX = x - offset;
  return {
    id,
    x1: dimX,
    y1,
    x2: dimX,
    y2,
    ext1: { x1: x, y1, x2: dimX, y2: y1 },
    ext2: { x1: x, y1: y2, x2: dimX, y2 },
    label,
    labelX: dimX,
    labelY: (y1 + y2) / 2,
    rotation: 90,
  };
}

function largestRoom(
  rooms: PlanRoom[],
  predicate: (r: PlanRoom) => boolean,
): PlanRoom | null {
  const list = rooms.filter(predicate);
  if (!list.length) return null;
  return list.reduce((a, b) =>
    a.width * a.height >= b.width * b.height ? a : b,
  );
}

/** At most 4 subtle estimated dimensions for the public plan. */
export function buildPreliminaryDimensions(
  rooms: PlanRoom[],
  scale: PreliminaryScale,
  plan?: GeneratedPlan,
): PlanDimension[] {
  const m = scale.mPerCanvasUnit;
  const bounds = coveredBounds(rooms);
  if (!bounds) return [];

  const dims: PlanDimension[] = [];
  const push = (d: PlanDimension | null) => {
    if (d && dims.length < 4) dims.push(d);
  };

  push(
    horizontalDimension(
      "cov-width",
      bounds.minX,
      bounds.maxX,
      bounds.maxY,
      bounds.width * m,
      2.4,
    ),
  );

  push(
    verticalDimension(
      "cov-height",
      bounds.minX,
      bounds.minY,
      bounds.maxY,
      bounds.height * m,
      2.4,
    ),
  );

  const patio = largestRoom(rooms, (r) => r.enclosure === "outdoor");
  if (patio && patio.width >= 5 && patio.height >= 3) {
    push(
      horizontalDimension(
        "patio-width",
        patio.x,
        patio.x + patio.width,
        patio.y + patio.height,
        patio.width * m,
        1.8,
      ),
    );
    if (dims.length < 4) {
      push(
        verticalDimension(
          "patio-depth",
          patio.x + patio.width,
          patio.y,
          patio.y + patio.height,
          patio.height * m,
          1.6,
        ),
      );
    }
  }

  if (dims.length < 4) {
    const social = largestRoom(rooms, (r) => r.zoneType === "social");
    if (
      social &&
      social.width >= 6 &&
      social.enclosure === "covered" &&
      social.id !== patio?.id
    ) {
      push(
        horizontalDimension(
          "social-width",
          social.x,
          social.x + social.width,
          social.y + social.height,
          social.width * m,
          1.5,
        ),
      );
    }
  }

  return dims;
}

export function buildDimensionsFromPlan(
  plan: GeneratedPlan,
  rooms: PlanRoom[],
): { scale: PreliminaryScale | null; dimensions: PlanDimension[] } {
  const scale = derivePreliminaryScale(rooms, plan.metadata.areaEstimate);
  if (!scale) return { scale: null, dimensions: [] };
  return {
    scale,
    dimensions: buildPreliminaryDimensions(rooms, scale, plan),
  };
}
