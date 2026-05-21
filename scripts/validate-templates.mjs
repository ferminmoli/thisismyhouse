#!/usr/bin/env node
/**
 * Valida que los slots base de plantillas no se solapen.
 * Uso: node scripts/validate-templates.mjs
 */
import { ARCHITECTURAL_TEMPLATES } from "../src/lib/architectural-templates/architecturalTemplates.ts";

function overlaps(a, b) {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

let failed = 0;
for (const t of ARCHITECTURAL_TEMPLATES) {
  const slots = t.slots;
  const pairs = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      if (overlaps(slots[i], slots[j])) {
        pairs.push(`${slots[i].slotId} ↔ ${slots[j].slotId}`);
      }
    }
  }
  if (pairs.length) {
    console.error(`✗ ${t.id}:`, pairs.join(", "));
    failed++;
  } else {
    console.log(`✓ ${t.id}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
