import type {
  ArchitecturalProgram,
  ProgrammaticZone,
  ProgramZoneType,
} from "@/lib/architectural-program/types";
import { normalizeZoneId, zoneIdMatchesAccepted } from "./normalize-zone-id";
import type {
  ArchitecturalTemplate,
  SlotAssignment,
  TemplateMappingResult,
  TemplateSlot,
  TemplateSlotGroup,
} from "./types";

const GROUP_FOR_TYPE: Record<ProgramZoneType, TemplateSlotGroup[]> = {
  circulation: ["access", "circulation"],
  social: ["social"],
  service: ["service"],
  private: ["private"],
  outdoor: ["outdoor"],
};

function isBathroomZone(z: ProgrammaticZone): boolean {
  const s = normalizeZoneId(z.id + z.label);
  return /BAN|BAÑ|WC|TOILET|SANIT/.test(s);
}

function isKitchenZone(z: ProgrammaticZone): boolean {
  return normalizeZoneId(z.id).includes("COCINA");
}

function slotsByGroup(template: ArchitecturalTemplate, group: TemplateSlotGroup) {
  return template.slots.filter((s) => s.group === group);
}

function slotsForType(template: ArchitecturalTemplate, type: ProgramZoneType) {
  const groups = GROUP_FOR_TYPE[type];
  return template.slots.filter((s) => groups.includes(s.group));
}

function assignZoneToSlot(
  zone: ProgrammaticZone,
  slot: TemplateSlot,
  assignments: SlotAssignment[],
  usedSlots: Set<string>,
  usedZones: Set<string>,
): boolean {
  if (usedZones.has(zone.id) || usedSlots.has(slot.slotId)) return false;
  assignments.push({
    slotId: slot.slotId,
    zoneId: zone.id,
    zoneLabel: zone.label,
    zoneType: zone.type,
  });
  usedSlots.add(slot.slotId);
  usedZones.add(zone.id);
  return true;
}

/** Permuta orden de slots privados según semilla (variantes sin mover geometría base). */
function orderedPrivateSlots(
  slots: TemplateSlot[],
  layoutSeed: number,
): TemplateSlot[] {
  if (slots.length <= 1 || layoutSeed <= 1) return slots;
  const copy = [...slots];
  const offset = (layoutSeed - 1) % copy.length;
  if (offset === 0) return copy;
  return [...copy.slice(offset), ...copy.slice(0, offset)];
}

/**
 * Asigna zonas del programa a slots curados (sin calcular x/y).
 */
export function mapProgramToTemplate(
  program: ArchitecturalProgram,
  template: ArchitecturalTemplate,
  layoutSeed = 1,
): TemplateMappingResult {
  const assignments: SlotAssignment[] = [];
  const warnings: string[] = [];
  const usedSlots = new Set<string>();
  const usedZones = new Set<string>();
  const zones = [...program.programmaticZones];

  const tryAssign = (zone: ProgrammaticZone, slot: TemplateSlot) =>
    assignZoneToSlot(zone, slot, assignments, usedSlots, usedZones);

  for (const zone of zones) {
    const direct = template.slots.find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        zoneIdMatchesAccepted(zone.id, s.acceptedRoomIds),
    );
    if (direct) tryAssign(zone, direct);
  }

  const kitchens = zones.filter((z) => !usedZones.has(z.id) && isKitchenZone(z));
  for (const zone of kitchens) {
    const slot = slotsByGroup(template, "service").find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        s.acceptedRoomIds.some((id) => normalizeZoneId(id).includes("COCINA")),
    );
    if (slot) tryAssign(zone, slot);
    else warnings.push(`Cocina ${zone.id} sin slot dedicado`);
  }

  for (const zone of zones.filter(
    (z) => !usedZones.has(z.id) && isBathroomZone(z),
  )) {
    const slot = template.slots.find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        s.group === "service" &&
        s.acceptedRoomIds.some((id) => /BAN|BAÑ/i.test(normalizeZoneId(id))),
    );
    if (slot) tryAssign(zone, slot);
  }

  const privates = zones
    .filter((z) => !usedZones.has(z.id) && z.type === "private")
    .sort((a, b) => b.idealAreaM2 - a.idealAreaM2);

  const privateSlots = orderedPrivateSlots(
    template.slots.filter((s) => s.group === "private"),
    layoutSeed,
  );

  for (let i = 0; i < privates.length; i++) {
    const zone = privates[i];
    const slot = privateSlots[i];
    if (slot) {
      tryAssign(zone, slot);
    } else {
      warnings.push(`Dormitorio ${zone.id} sin slot privado libre`);
    }
  }

  for (const zone of zones.filter((z) => !usedZones.has(z.id) && z.type === "social")) {
    const slot = slotsForType(template, "social").find((s) => !usedSlots.has(s.slotId));
    if (slot) tryAssign(zone, slot);
  }

  for (const zone of zones.filter((z) => !usedZones.has(z.id) && z.type === "outdoor")) {
    const slot = slotsForType(template, "outdoor").find((s) => !usedSlots.has(s.slotId));
    if (slot) tryAssign(zone, slot);
  }

  for (const zone of zones.filter((z) => !usedZones.has(z.id) && z.type === "circulation")) {
    const access = template.slots.find(
      (s) => s.group === "access" && !usedSlots.has(s.slotId),
    );
    const circ = template.slots.find(
      (s) => s.group === "circulation" && !usedSlots.has(s.slotId),
    );
    if (/ACCESO|RECIBIDOR|HALL/i.test(zone.id) && access) {
      tryAssign(zone, access);
    } else if (circ) {
      tryAssign(zone, circ);
    } else if (access) {
      tryAssign(zone, access);
    }
  }

  for (const zone of zones.filter((z) => !usedZones.has(z.id))) {
    const slot = template.slots.find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        GROUP_FOR_TYPE[zone.type].includes(s.group),
    );
    if (slot) {
      tryAssign(zone, slot);
      warnings.push(`${zone.id} asignado por tipo (${slot.slotId}), no por ID`);
    } else {
      warnings.push(`Sin slot para ${zone.id} (${zone.label}) — no se dibuja`);
    }
  }

  const unmappedZoneIds = zones
    .filter((z) => !usedZones.has(z.id))
    .map((z) => z.id);

  return { assignments, unmappedZoneIds, warnings };
}
