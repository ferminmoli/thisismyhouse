import type { FurnitureHint, RenderDoor, RenderWindow } from "./generatedPlan";
import type { RoomType } from "./architecturalProgram";

export type PartiSlot = {
  slotId: string;
  label: string;
  group: RoomType;
  acceptedRoomIds: string[];
  acceptedTypes: RoomType[];
  x: number;
  y: number;
  width: number;
  height: number;
  isOptional?: boolean;
  notes?: string;
};

export type PartiTemplateId = "l_shape_patio";

export type PartiTemplate = {
  id: PartiTemplateId;
  name: string;
  description: string;
  canvas: { width: number; height: number };
  slots: PartiSlot[];
  defaultDoors: Omit<RenderDoor, "id">[];
  defaultWindows: Omit<RenderWindow, "id">[];
  defaultFurniture: Omit<FurnitureHint, "id">[];
};

export const L_SHAPE_PATIO_TEMPLATE: PartiTemplate = {
  id: "l_shape_patio",
  name: "Casa en L con patio social",
  description:
    "Planta en L curada: núcleo social amplio conectado a cocina y patio; ala privada agrupada con distribuidor y baño.",
  canvas: { width: 100, height: 100 },
  slots: [
    {
      slotId: "access",
      label: "Acceso",
      group: "circulation",
      acceptedRoomIds: ["ACCESO"],
      acceptedTypes: ["circulation"],
      x: 8,
      y: 54,
      width: 12,
      height: 14,
    },
    {
      slotId: "social_main",
      label: "Sala / comedor",
      group: "social",
      acceptedRoomIds: ["SALA_COMEDOR", "LIVING_COMEDOR", "ESTAR_COMEDOR"],
      acceptedTypes: ["social"],
      x: 20,
      y: 52,
      width: 38,
      height: 28,
    },
    {
      slotId: "kitchen",
      label: "Cocina",
      group: "service",
      acceptedRoomIds: ["COCINA"],
      acceptedTypes: ["service"],
      x: 58,
      y: 52,
      width: 18,
      height: 28,
    },
    {
      slotId: "bedroom_master",
      label: "Dormitorio principal",
      group: "private",
      acceptedRoomIds: ["DORMITORIO_PRINCIPAL", "DORMITORIO_1"],
      acceptedTypes: ["private"],
      x: 62,
      y: 10,
      width: 30,
      height: 28,
    },
    {
      slotId: "bedroom_2",
      label: "Dormitorio 2",
      group: "private",
      acceptedRoomIds: ["DORMITORIO_2"],
      acceptedTypes: ["private"],
      x: 62,
      y: 38,
      width: 30,
      height: 14,
    },
    {
      slotId: "bedroom_3",
      label: "Dormitorio 3",
      group: "private",
      acceptedRoomIds: ["DORMITORIO_3"],
      acceptedTypes: ["private"],
      x: 34,
      y: 8,
      width: 28,
      height: 24,
    },
    {
      slotId: "bath",
      label: "Baño",
      group: "service",
      acceptedRoomIds: ["BANIO", "BANO", "BAÑO", "BANIO_PRINCIPAL"],
      acceptedTypes: ["service"],
      x: 34,
      y: 32,
      width: 14,
      height: 14,
    },
    {
      slotId: "distributor",
      label: "Distribuidor",
      group: "circulation",
      acceptedRoomIds: ["DISTRIBUIDOR", "PASILLO"],
      acceptedTypes: ["circulation"],
      x: 48,
      y: 32,
      width: 14,
      height: 20,
    },
    {
      slotId: "patio",
      label: "Patio",
      group: "outdoor",
      acceptedRoomIds: ["PATIO", "PATIO_INTERIOR", "PATIO_CON_PARRILLA"],
      acceptedTypes: ["outdoor"],
      x: 20,
      y: 80,
      width: 56,
      height: 16,
    },
  ],
  defaultDoors: [
    {
      from: "ACCESO",
      to: "SALA_COMEDOR",
      type: "open_passage",
      wall: "right",
      position: 50,
      width: 8,
    },
    {
      from: "SALA_COMEDOR",
      to: "COCINA",
      type: "open_passage",
      wall: "right",
      position: 50,
      width: 12,
    },
    {
      from: "SALA_COMEDOR",
      to: "PATIO",
      type: "sliding",
      wall: "bottom",
      position: 55,
      width: 18,
    },
    {
      from: "DISTRIBUIDOR",
      to: "DORMITORIO_PRINCIPAL",
      type: "door",
      wall: "right",
      position: 40,
      width: 6,
    },
    {
      from: "DISTRIBUIDOR",
      to: "DORMITORIO_2",
      type: "door",
      wall: "right",
      position: 85,
      width: 6,
    },
    {
      from: "DISTRIBUIDOR",
      to: "DORMITORIO_3",
      type: "door",
      wall: "top",
      position: 50,
      width: 6,
    },
    {
      from: "DISTRIBUIDOR",
      to: "BANIO",
      type: "door",
      wall: "left",
      position: 50,
      width: 6,
    },
  ],
  defaultWindows: [
    {
      zoneId: "SALA_COMEDOR",
      wall: "bottom",
      position: 45,
      width: 20,
      size: "large",
      reason: "Apertura principal hacia patio y luz natural",
    },
    {
      zoneId: "COCINA",
      wall: "right",
      position: 50,
      width: 10,
      size: "medium",
      reason: "Ventilación e iluminación de cocina",
    },
    {
      zoneId: "DORMITORIO_PRINCIPAL",
      wall: "top",
      position: 55,
      width: 12,
      size: "medium",
      reason: "Luz natural en dormitorio principal",
    },
    {
      zoneId: "DORMITORIO_2",
      wall: "right",
      position: 50,
      width: 10,
      size: "medium",
      reason: "Luz natural en dormitorio",
    },
    {
      zoneId: "DORMITORIO_3",
      wall: "top",
      position: 50,
      width: 10,
      size: "medium",
      reason: "Luz natural en dormitorio",
    },
    {
      zoneId: "BANIO",
      wall: "top",
      position: 50,
      width: 5,
      size: "small",
      reason: "Ventilación natural del baño",
    },
  ],
  defaultFurniture: [
    { zoneId: "SALA_COMEDOR", type: "sofa", x: 24, y: 58, width: 14, height: 6 },
    {
      zoneId: "SALA_COMEDOR",
      type: "dining_table",
      x: 38,
      y: 62,
      width: 12,
      height: 10,
    },
    {
      zoneId: "COCINA",
      type: "kitchen_counter",
      x: 60,
      y: 58,
      width: 14,
      height: 4,
    },
    {
      zoneId: "DORMITORIO_PRINCIPAL",
      type: "bed_double",
      x: 68,
      y: 16,
      width: 12,
      height: 10,
    },
    {
      zoneId: "DORMITORIO_PRINCIPAL",
      type: "wardrobe",
      x: 82,
      y: 12,
      width: 8,
      height: 6,
    },
    {
      zoneId: "DORMITORIO_2",
      type: "bed_single",
      x: 70,
      y: 42,
      width: 10,
      height: 8,
    },
    {
      zoneId: "DORMITORIO_3",
      type: "bed_single",
      x: 40,
      y: 14,
      width: 10,
      height: 8,
    },
    {
      zoneId: "BANIO",
      type: "bath_fixture",
      x: 36,
      y: 36,
      width: 8,
      height: 6,
    },
    { zoneId: "PATIO", type: "grill", x: 42, y: 86, width: 8, height: 6 },
  ],
};

const TEMPLATES: Record<PartiTemplateId, PartiTemplate> = {
  l_shape_patio: L_SHAPE_PATIO_TEMPLATE,
};

export function getPartiTemplate(id: PartiTemplateId): PartiTemplate {
  return TEMPLATES[id];
}

export function selectPartiTemplate(
  templateId: string,
): { template: PartiTemplate; warning?: string } {
  if (templateId === "l_shape_patio") {
    return { template: L_SHAPE_PATIO_TEMPLATE };
  }
  return {
    template: L_SHAPE_PATIO_TEMPLATE,
    warning: `Template "${templateId}" no implementado; usando l_shape_patio.`,
  };
}
