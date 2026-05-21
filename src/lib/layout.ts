import {
  hasSignificantOverlaps,
  packArchitecturalLayout,
  refineCasaChicaLayout,
  resolveZoneOverlaps,
  snapZonesToGrid,
} from "./architectural-layout";
import type { ConceptPlan } from "./types";

type Zone = ConceptPlan["zones"][number];

const MIN_PCT = 14;
const CANVAS_MARGIN = 4;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function zoneArea(z: Zone) {
  return z.width * z.height;
}

function rectsOverlap(a: Zone, b: Zone, minRatio: number): boolean {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x1 || y2 <= y1) return false;
  const overlap = (x2 - x1) * (y2 - y1);
  const smaller = Math.min(zoneArea(a), zoneArea(b));
  return smaller > 0 && overlap / smaller >= minRatio;
}

function scaleIfNormalized(zones: Zone[]): Zone[] {
  const maxVal = Math.max(
    ...zones.flatMap((z) => [z.x, z.y, z.x + z.width, z.y + z.height]),
  );
  if (maxVal > 1.5) return zones;
  return zones.map((z) => ({
    ...z,
    x: z.x * 100,
    y: z.y * 100,
    width: z.width * 100,
    height: z.height * 100,
  }));
}

function clampZone(z: Zone): Zone {
  let width = clamp(z.width, MIN_PCT, 100 - CANVAS_MARGIN * 2);
  let height = clamp(z.height, MIN_PCT, 100 - CANVAS_MARGIN * 2);
  const x = clamp(z.x, CANVAS_MARGIN, 100 - CANVAS_MARGIN - width);
  const y = clamp(z.y, CANVAS_MARGIN, 100 - CANVAS_MARGIN - height);
  return { ...z, x, y, width, height };
}

function needsAutoLayout(zones: Zone[]): boolean {
  if (zones.length <= 1) return false;

  const rounded = zones.map((z) => `${Math.round(z.x)}-${Math.round(z.y)}`);
  if (new Set(rounded).size === 1) return true;

  const avgArea =
    zones.reduce((sum, z) => sum + zoneArea(z), 0) / zones.length;
  if (avgArea < 60) return true;

  let overlaps = 0;
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlap(zones[i], zones[j], 0.45)) overlaps++;
    }
  }
  return overlaps >= Math.max(2, zones.length - 1);
}

/** Normalize Gemini coordinates before render (fixes stacked/tiny zones). */
export function normalizeConceptPlan(plan: ConceptPlan): ConceptPlan {
  let zones = scaleIfNormalized(plan.zones.map(clampZone));
  if (needsAutoLayout(zones)) {
    zones = packArchitecturalLayout(zones);
  } else {
    zones = snapZonesToGrid(zones);
    const refined = refineCasaChicaLayout(zones);
    if (refined) {
      zones = refined;
    } else if (hasSignificantOverlaps(zones)) {
      zones = resolveZoneOverlaps(zones);
    }
  }
  return { ...plan, zones };
}
