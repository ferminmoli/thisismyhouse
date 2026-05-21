import type { ArchitecturalTemplate } from "./types";

function slotsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** Valida geometría base de slots (sin variantes). */
export function validateTemplateSlots(template: ArchitecturalTemplate): {
  ok: boolean;
  overlaps: Array<{ a: string; b: string }>;
} {
  const overlaps: Array<{ a: string; b: string }> = [];
  const slots = template.slots;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (slotsOverlap(slots[i], slots[j])) {
        overlaps.push({ a: slots[i].slotId, b: slots[j].slotId });
      }
    }
  }
  return { ok: overlaps.length === 0, overlaps };
}
