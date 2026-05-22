import type { ArchitecturalProgram, ProgramRoom } from "./architecturalProgram";
import type {
  FurnitureHint,
  GeneratedPlan,
  RenderDoor,
  RenderWindow,
  RenderZone,
  RoomSlotMapping,
} from "./generatedPlan";
import {
  getPartiTemplate,
  selectPartiTemplate,
  type PartiSlot,
  type PartiTemplate,
} from "./partiTemplates";
import { enrichPlanSpatialMetadata } from "./planMetadata";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { TopologyGraph } from "./topologyGraph";

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function priorityScore(room: ProgramRoom): number {
  const p = room.priority === "high" ? 3 : room.priority === "medium" ? 2 : 1;
  return p * 1000 + (room.idealAreaM2 ?? 0);
}

const PRIVATE_SLOT_ORDER = ["bedroom_master", "bedroom_2", "bedroom_3"] as const;

const SLOT_BY_ROOM_RULES: Array<{ roomPattern: RegExp; slotId: string }> = [
  { roomPattern: /^SALA|^LIVING|^ESTAR|^COMEDOR/, slotId: "social_main" },
  { roomPattern: /^COCINA/, slotId: "kitchen" },
  { roomPattern: /^BANIO|^BANO|^BAÑO/, slotId: "bath" },
  { roomPattern: /^DISTRIBUIDOR|^PASILLO/, slotId: "distributor" },
  { roomPattern: /^PATIO/, slotId: "patio" },
  { roomPattern: /^ACCESO|^FOYER|^ENTRANCE/, slotId: "access" },
];

export function mapRoomsToSlots(
  rooms: ProgramRoom[],
  slots: PartiSlot[],
): {
  zones: RenderZone[];
  mapping: RoomSlotMapping[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const mapping: RoomSlotMapping[] = [];
  const usedSlots = new Set<string>();
  const slotById = Object.fromEntries(slots.map((s) => [s.slotId, s]));
  const assignedRooms = new Set<string>();

  const tryAssign = (
    room: ProgramRoom,
    slotId: string,
    confidence: RoomSlotMapping["confidence"],
    reason: string,
  ): boolean => {
    if (assignedRooms.has(norm(room.id)) || usedSlots.has(slotId)) return false;
    const slot = slotById[slotId];
    if (!slot) return false;
    usedSlots.add(slotId);
    assignedRooms.add(norm(room.id));
    mapping.push({
      roomId: norm(room.id),
      roomLabel: room.label,
      slotId,
      confidence,
      reason,
    });
    return true;
  };

  for (const room of rooms) {
    const id = norm(room.id);
    const slot = slots.find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        s.acceptedRoomIds.some((rid) => norm(rid) === id),
    );
    if (slot) {
      tryAssign(
        room,
        slot.slotId,
        "high",
        `Coincidencia exacta acceptedRoomIds → ${slot.slotId}`,
      );
    }
  }

  const privates = rooms
    .filter((r) => r.type === "private" && !assignedRooms.has(norm(r.id)))
    .sort((a, b) => priorityScore(b) - priorityScore(a));

  for (let i = 0; i < privates.length && i < PRIVATE_SLOT_ORDER.length; i++) {
    const room = privates[i]!;
    const slotId = PRIVATE_SLOT_ORDER[i]!;
    tryAssign(
      room,
      slotId,
      "high",
      `Dormitorio por prioridad/área → ${slotId}`,
    );
  }

  for (const rule of SLOT_BY_ROOM_RULES) {
    for (const room of rooms) {
      if (assignedRooms.has(norm(room.id))) continue;
      if (!rule.roomPattern.test(norm(room.id))) continue;
      if (tryAssign(room, rule.slotId, "high", `Regla id → ${rule.slotId}`)) break;
    }
  }

  for (const room of rooms) {
    if (assignedRooms.has(norm(room.id))) continue;
    const slot = slots.find(
      (s) =>
        !usedSlots.has(s.slotId) &&
        s.acceptedTypes.includes(room.type) &&
        !s.isOptional,
    );
    if (slot) {
      tryAssign(
        room,
        slot.slotId,
        "medium",
        `Coincidencia acceptedTypes (${room.type})`,
      );
    }
  }

  for (const room of rooms) {
    if (assignedRooms.has(norm(room.id))) continue;
    if (room.required) {
      warnings.push(`Ambiente requerido sin slot: ${room.id} (${room.label})`);
    } else {
      warnings.push(`Ambiente opcional sin slot: ${room.id}`);
    }
  }

  const zones: RenderZone[] = mapping.map((m) => {
    const slot = slotById[m.slotId]!;
    const room = rooms.find((r) => norm(r.id) === m.roomId)!;
    return {
      id: `zone_${m.roomId}`,
      label: room.label,
      type: room.type,
      x: slot.x,
      y: slot.y,
      width: slot.width,
      height: slot.height,
      sourceRoomId: m.roomId,
      slotId: m.slotId,
      priority: room.priority,
      notes: slot.notes,
    };
  });

  return { zones, mapping, warnings };
}

function zoneIdsForRooms(zones: RenderZone[]): Set<string> {
  return new Set(zones.map((z) => norm(z.sourceRoomId)));
}

function buildDoors(
  template: PartiTemplate,
  zones: RenderZone[],
  warnings: string[],
): RenderDoor[] {
  const roomIds = zoneIdsForRooms(zones);
  const doors: RenderDoor[] = [];

  for (const [i, spec] of template.defaultDoors.entries()) {
    if (!roomIds.has(norm(spec.from)) || !roomIds.has(norm(spec.to))) {
      warnings.push(
        `Puerta omitida (zona ausente): ${spec.from} → ${spec.to}`,
      );
      continue;
    }
    doors.push({
      id: `door_${i}_${norm(spec.from)}_${norm(spec.to)}`,
      ...spec,
      from: norm(spec.from),
      to: norm(spec.to),
    });
  }

  return doors;
}

function buildWindows(
  template: PartiTemplate,
  zones: RenderZone[],
  warnings: string[],
): RenderWindow[] {
  const roomIds = zoneIdsForRooms(zones);
  const windows: RenderWindow[] = [];

  for (const [i, spec] of template.defaultWindows.entries()) {
    const zid = norm(spec.zoneId);
    if (!roomIds.has(zid)) {
      warnings.push(`Ventana omitida (zona ausente): ${spec.zoneId}`);
      continue;
    }
    windows.push({
      id: `window_${i}_${zid}`,
      ...spec,
      zoneId: zid,
    });
  }

  return windows;
}

function buildFurniture(
  template: PartiTemplate,
  zones: RenderZone[],
  warnings: string[],
): FurnitureHint[] {
  const zoneByRoom = Object.fromEntries(
    zones.map((z) => [norm(z.sourceRoomId), z]),
  );
  const hints: FurnitureHint[] = [];

  for (const [i, spec] of template.defaultFurniture.entries()) {
    const zone = zoneByRoom[norm(spec.zoneId)];
    if (!zone) {
      warnings.push(`Mobiliario omitido (zona ausente): ${spec.zoneId}`);
      continue;
    }
    hints.push({
      id: `furn_${i}_${spec.type}`,
      zoneId: norm(spec.zoneId),
      type: spec.type,
      x: spec.x,
      y: spec.y,
      width: spec.width,
      height: spec.height,
      rotation: spec.rotation,
    });
  }

  return hints;
}

export type GeneratePlanParams = {
  program: ArchitecturalProgram;
  topologyGraph: TopologyGraph;
  strategy: ArchitecturalStrategy;
};

export function generatePlanFromParti(params: GeneratePlanParams): GeneratedPlan {
  const { program, strategy } = params;
  const templateId = strategy.preferredParti;
  const { template, warning: templateWarning } = selectPartiTemplate(templateId);

  const notes: string[] = [
    "Geometry source: curated l_shape_patio template",
    "LLM geometry: disabled",
    "Grid engine: disabled",
  ];
  const warnings: string[] = [];
  if (templateWarning) warnings.push(templateWarning);
  if (strategy.preferredParti !== "l_shape_patio") {
    warnings.push(
      `Estrategia prefiere ${strategy.preferredParti}; solo l_shape_patio está implementado.`,
    );
  }

  const { zones, mapping, warnings: mapWarnings } = mapRoomsToSlots(
    program.rooms,
    template.slots,
  );
  warnings.push(...mapWarnings);

  const doors = buildDoors(template, zones, warnings);
  const windows = buildWindows(template, zones, warnings);
  const furniture = buildFurniture(template, zones, warnings);

  return enrichPlanSpatialMetadata(
    {
      id: `plan_${template.id}_${Date.now()}`,
      title: program.title,
      templateId: template.id,
      variantLabel: "base",
      zones,
      doors,
      windows,
      furniture,
      metadata: {
        parti: strategy.preferredParti,
        templateName: template.name,
        mapping,
        warnings,
        notes,
      },
    },
    program,
  );
}
