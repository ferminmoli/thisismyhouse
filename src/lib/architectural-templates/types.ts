import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type { PlanShape } from "@/lib/onboarding/user-preferences";

export type TemplateSlotGroup =
  | "access"
  | "social"
  | "service"
  | "private"
  | "circulation"
  | "outdoor";

export type TemplateDoorSide = "north" | "south" | "east" | "west";

export type TemplateDoorHint = {
  slotId: string;
  side: TemplateDoorSide;
  /** Slot vecino (adyacencia física en plantilla). */
  connectsToSlotId?: string;
};

export type TemplateWindowHint = {
  slotId: string;
  side: TemplateDoorSide;
  /** 0–1 a lo largo del muro. */
  position?: number;
};

export type TemplateFurnitureHint = {
  slotId: string;
  kind: "bed" | "sofa" | "table" | "counter" | "wc" | "shower";
};

export type TemplateSlot = {
  slotId: string;
  group: TemplateSlotGroup;
  acceptedRoomIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TemplateAdjacency = {
  fromSlotId: string;
  toSlotId: string;
  note?: string;
};

export type ArchitecturalTemplate = {
  id: string;
  label: string;
  shape: PlanShape;
  targetBedrooms?: number;
  targetBathrooms?: number;
  /** Lienzo de diseño en píxeles (coordenadas de slots). */
  canvas: { width: number; height: number };
  /** Vacío L: celdas no habitables (misma convención que grid-scale). */
  lVoidUpperRight?: boolean;
  /** Rectángulos de patio/terreno fuera del volumen cerrado (solo relleno). */
  outdoorRects?: Array<{ x: number; y: number; width: number; height: number }>;
  slots: TemplateSlot[];
  defaultDoors: TemplateDoorHint[];
  defaultWindows: TemplateWindowHint[];
  furnitureHints: TemplateFurnitureHint[];
  hardAdjacencies: TemplateAdjacency[];
  softAdjacencies: TemplateAdjacency[];
};

export type SlotAssignment = {
  slotId: string;
  zoneId: string;
  zoneLabel: string;
  zoneType: ProgramZoneType;
};

export type TemplateMappingResult = {
  assignments: SlotAssignment[];
  unmappedZoneIds: string[];
  warnings: string[];
};

export type TemplateSelectionResult = {
  template: ArchitecturalTemplate;
  reason: string;
};

export type TemplateValidationResult = {
  ok: boolean;
  overlaps: Array<{ a: string; b: string }>;
  outOfBounds: string[];
  missingMappings: string[];
  invalidDoorRefs: string[];
  warnings: string[];
};

export type TemplateLayoutMeta = {
  templateId: string;
  templateLabel: string;
  selectionReason: string;
  mappedRooms: SlotAssignment[];
  unmappedRooms: string[];
  ignoredSoftAdjacencies: TemplateAdjacency[];
  validation: TemplateValidationResult;
};
