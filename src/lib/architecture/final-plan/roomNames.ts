import type { RenderZone } from "../generatedPlan";
import { enclosureOfZone, isSemiOutdoorSpace } from "../spaceClassification";

const LABEL_ALIASES: Record<string, string> = {
  SALA_COMEDOR: "Estar / comedor",
  LIVING: "Estar / comedor",
  ESTAR_COMEDOR: "Estar / comedor",
  DORMITORIO_PRINCIPAL: "Dormitorio principal",
  DORMITORIO_1: "Dormitorio 1",
  DORMITORIO_2: "Dormitorio 2",
  DORMITORIO_3: "Dormitorio 3",
  BANIO: "Baño",
  BAÑO: "Baño",
  BANO: "Baño",
  BATH: "Baño",
  DISTRIBUIDOR: "Distribuidor",
  LAVADERO: "Lavadero",
  LAUNDRY: "Lavadero",
  PATIO: "Patio",
  COCINA: "Cocina",
  KITCHEN: "Cocina",
  ACCESO: "Acceso",
  GALERIA: "Galería",
  GALLERY: "Galería",
  ENTRADA: "Acceso",
  HALL: "Distribuidor",
};

function norm(id: string): string {
  return id.trim().toUpperCase().replace(/^ZONE_/, "");
}

/** Argentine / LatAm architectural room labels (title case). */
export function architecturalRoomName(zone: RenderZone): string {
  const rawId = norm(zone.sourceRoomId);
  if (LABEL_ALIASES[rawId]) return LABEL_ALIASES[rawId];

  if (rawId === "DORMITORIO_PRINCIPAL" || /DORMITORIO.*PRINCIPAL/i.test(rawId)) {
    return "Dormitorio principal";
  }
  const dormMatch = rawId.match(/^DORMITORIO[_\s]?(\d+)$/i);
  if (dormMatch) return `Dormitorio ${dormMatch[1]}`;

  if (isSemiOutdoorSpace(zone.type)) {
    if (/galer/i.test(zone.label) || /galer/i.test(rawId)) return "Galería";
    return zone.label?.trim() || "Semi-cubierto";
  }

  if (/lavadero|laundry/i.test(zone.label) || /LAVADERO|LAUNDRY/i.test(rawId)) {
    return "Lavadero";
  }

  if (
    /SALA|ESTAR|LIVING|COMEDOR/i.test(rawId) ||
    /sala|estar|living|comedor/i.test(zone.label ?? "")
  ) {
    return "Estar / comedor";
  }

  const fromLabel = zone.label?.trim();
  if (fromLabel && !/^zone[_\s]/i.test(fromLabel) && fromLabel.length < 32) {
    return fromLabel;
  }

  return rawId
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function wetRoomKind(zone: RenderZone): import("./types").WetRoomKind {
  const raw = norm(zone.sourceRoomId);
  const label = (zone.label ?? "").toUpperCase();
  if (/BANIO|BAÑO|BANO|BATH/.test(raw) || /BAÑO|BANO/.test(label)) {
    return "bathroom";
  }
  if (/LAVADERO|LAUNDRY/.test(raw) || /LAVADERO/.test(label)) return "laundry";
  if (/COCINA|KITCHEN/.test(raw) || /COCINA/.test(label)) return "kitchen";
  if (zone.type === "service") return "service";
  return "none";
}
