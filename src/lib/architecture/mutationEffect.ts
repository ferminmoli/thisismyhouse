import type {
  FurnitureHint,
  GeneratedPlan,
  RenderDoor,
  RenderWindow,
  RenderZone,
} from "./generatedPlan";
import { findZoneByRoom } from "./planNormalize";

export type MutationEffect = {
  changed: boolean;
  changedZones: string[];
  changedDoors: string[];
  changedWindows: string[];
  changedFurniture: string[];
  notes: string[];
};

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function zoneGeometryKey(z: RenderZone): string {
  return `${z.x},${z.y},${z.width},${z.height}`;
}

function doorKey(d: RenderDoor): string {
  return `${norm(d.from)}-${norm(d.to)}:${d.wall}:${d.position}:${d.width}:${d.type}`;
}

function windowKey(w: RenderWindow): string {
  return `${norm(w.zoneId)}:${w.wall}:${w.position}:${w.width}:${w.size}`;
}

function furnitureKey(f: FurnitureHint): string {
  return `${f.id}:${norm(f.zoneId)}:${f.type}:${f.x},${f.y},${f.width},${f.height}`;
}

function newMetadataNotes(base: GeneratedPlan, result: GeneratedPlan): string[] {
  const baseSet = new Set(base.metadata.notes);
  return result.metadata.notes.filter((n) => !baseSet.has(n));
}

function newZoneNotes(base: GeneratedPlan, result: GeneratedPlan): string[] {
  const out: string[] = [];
  for (const z of result.zones) {
    const b = findZoneByRoom(base.zones, z.sourceRoomId);
    if (z.notes && z.notes !== b?.notes) {
      out.push(`${z.sourceRoomId}: ${z.notes}`);
    }
  }
  return out;
}

export function computeMutationEffect(
  basePlan: GeneratedPlan,
  resultPlan: GeneratedPlan,
  applyNotes: string[] = [],
): MutationEffect {
  const changedZones: string[] = [];
  for (const z of resultPlan.zones) {
    const b = findZoneByRoom(basePlan.zones, z.sourceRoomId);
    if (!b || zoneGeometryKey(b) !== zoneGeometryKey(z)) {
      changedZones.push(norm(z.sourceRoomId));
    }
  }

  const baseDoorByEdge = new Map(
    basePlan.doors.map((d) => [`${norm(d.from)}-${norm(d.to)}`, d]),
  );
  const changedDoors: string[] = [];
  for (const d of resultPlan.doors) {
    const key = `${norm(d.from)}-${norm(d.to)}`;
    const b = baseDoorByEdge.get(key);
    if (!b || doorKey(b) !== doorKey(d)) {
      changedDoors.push(key);
    }
  }

  const baseWinById = new Map(basePlan.windows.map((w) => [w.id, w]));
  const changedWindows: string[] = [];
  for (const w of resultPlan.windows) {
    const b = baseWinById.get(w.id);
    if (!b || windowKey(b) !== windowKey(w)) {
      changedWindows.push(w.id);
    }
  }

  const baseFurnById = new Map(basePlan.furniture.map((f) => [f.id, f]));
  const changedFurniture: string[] = [];
  for (const f of resultPlan.furniture) {
    const b = baseFurnById.get(f.id);
    if (!b || furnitureKey(b) !== furnitureKey(f)) {
      changedFurniture.push(f.id);
    }
  }

  const semanticNotes = [
    ...newMetadataNotes(basePlan, resultPlan),
    ...newZoneNotes(basePlan, resultPlan),
  ];

  const notes = dedupeStrings([...applyNotes, ...semanticNotes]);

  const changed =
    changedZones.length > 0 ||
    changedDoors.length > 0 ||
    changedWindows.length > 0 ||
    changedFurniture.length > 0 ||
    semanticNotes.length > 0;

  return {
    changed,
    changedZones,
    changedDoors,
    changedWindows,
    changedFurniture,
    notes,
  };
}

export function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
