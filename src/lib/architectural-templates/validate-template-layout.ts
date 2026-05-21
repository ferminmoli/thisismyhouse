import { isLShapeVoidCell } from "@/lib/floorplan-layout/grid-scale";
import type { PlacedZoneRect } from "@/lib/floorplan-layout/types";
import { rectArea } from "@/lib/floorplan-layout/geometry";
import type {
  ArchitecturalTemplate,
  SlotAssignment,
  TemplateValidationResult,
} from "./types";

function rectsOverlap(a: PlacedZoneRect, b: PlacedZoneRect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** Muestra de puntos dentro del rect para validar vacío L. */
function rectSamples(
  x: number,
  y: number,
  w: number,
  h: number,
  step = 20,
): Array<{ px: number; py: number }> {
  const pts: Array<{ px: number; py: number }> = [];
  for (let px = x + step / 2; px < x + w; px += step) {
    for (let py = y + step / 2; py < y + h; py += step) {
      pts.push({ px, py });
    }
  }
  return pts;
}

function rectOutsideLVoid(
  zone: PlacedZoneRect,
  cellW: number,
  cellH: number,
): boolean {
  for (const { px, py } of rectSamples(zone.x, zone.y, zone.width, zone.height)) {
    const col = Math.floor(px / cellW);
    const row = Math.floor(py / cellH);
    if (isLShapeVoidCell(col, row)) return true;
  }
  return false;
}

export function validateTemplateLayout(
  template: ArchitecturalTemplate,
  zones: PlacedZoneRect[],
  assignments: SlotAssignment[],
): TemplateValidationResult {
  const overlaps: Array<{ a: string; b: string }> = [];
  const outOfBounds: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlap(zones[i], zones[j])) {
        overlaps.push({ a: zones[i].id, b: zones[j].id });
      }
    }
  }

  const { width: cw, height: ch } = template.canvas;
  const cellW = template.shape === "l_shape" ? cw / 10 : cw;
  const cellH = template.shape === "l_shape" ? ch / 10 : ch;

  for (const z of zones) {
    if (z.x < 0 || z.y < 0 || z.x + z.width > cw || z.y + z.height > ch) {
      outOfBounds.push(z.id);
    }
    if (template.lVoidUpperRight && rectOutsideLVoid(z, cellW, cellH)) {
      outOfBounds.push(`${z.id} (invade hueco L)`);
    }
  }

  const slotIds = new Set(template.slots.map((s) => s.slotId));
  const invalidDoorRefs: string[] = [];
  for (const d of template.defaultDoors) {
    if (!slotIds.has(d.slotId)) invalidDoorRefs.push(`door:${d.slotId}`);
    if (d.connectsToSlotId && !slotIds.has(d.connectsToSlotId)) {
      invalidDoorRefs.push(`door:${d.slotId}->${d.connectsToSlotId}`);
    }
  }

  const mappedIds = new Set(assignments.map((a) => a.zoneId));
  const missingMappings = template.slots
    .filter((s) => !assignments.some((a) => a.slotId === s.slotId))
    .map((s) => s.slotId);

  if (missingMappings.length > 0) {
    warnings.push(`Slots vacíos: ${missingMappings.join(", ")}`);
  }

  const sumArea = zones.reduce((s, z) => s + rectArea(z), 0);
  const slotSum = template.slots.reduce(
    (s, sl) => s + sl.width * sl.height,
    0,
  );
  if (sumArea > slotSum * 1.02) {
    warnings.push("Suma de bbox supera área de slots (revisar duplicados)");
  }

  const ok =
    overlaps.length === 0 &&
    outOfBounds.length === 0 &&
    invalidDoorRefs.length === 0;

  return {
    ok,
    overlaps,
    outOfBounds,
    missingMappings,
    invalidDoorRefs,
    warnings,
  };
}
