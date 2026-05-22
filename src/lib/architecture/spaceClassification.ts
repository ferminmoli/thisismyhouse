import type { ProgramRoom } from "./architecturalProgram";
import type { RenderZone } from "./generatedPlan";

export type SpaceEnclosure = "covered" | "semi_covered" | "outdoor";

/** Ambientes cubiertos habitables y circulación interior. */
export function isCoveredSpace(type: RenderZone["type"]): boolean {
  return (
    type === "social" ||
    type === "private" ||
    type === "service" ||
    type === "circulation" ||
    type === "work" ||
    type === "flex"
  );
}

export function isSemiOutdoorSpace(type: RenderZone["type"]): boolean {
  return type === "semi_outdoor";
}

export function isOutdoorSpace(type: RenderZone["type"]): boolean {
  return type === "outdoor";
}

export function enclosureOfZone(zone: RenderZone): SpaceEnclosure {
  if (isSemiOutdoorSpace(zone.type)) return "semi_covered";
  if (isOutdoorSpace(zone.type)) return "outdoor";
  return "covered";
}

export function zoneCanvasArea(zone: RenderZone): number {
  return zone.width * zone.height;
}

export function isWetServiceRoom(roomId: string): boolean {
  const id = roomId.toUpperCase();
  return /COCINA|BANIO|BAÑO|LAVADERO|LAVANDER/i.test(id);
}

export function isBedroomRoom(roomId: string, type?: RenderZone["type"]): boolean {
  return type === "private" || /DORMITORIO|BEDROOM/i.test(roomId);
}

export function isFamilyHouseProgram(rooms: ProgramRoom[]): boolean {
  const bedrooms = rooms.filter((r) => isBedroomRoom(r.id, r.type)).length;
  return bedrooms >= 2;
}
