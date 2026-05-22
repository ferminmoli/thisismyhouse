import type { RoomType } from "./architecturalProgram";
import type { AreaEstimate, CoordinateSystem } from "./planMetadata";

export type ArchitecturalValidationSeverity = "info" | "warning" | "error";

export type ArchitecturalValidationIssue = {
  code: string;
  severity: ArchitecturalValidationSeverity;
  affectedRoomIds: string[];
  message: string;
  suggestion: string;
};

export type RenderZone = {
  id: string;
  label: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  sourceRoomId: string;
  slotId: string;
  priority: "low" | "medium" | "high";
  notes?: string;
};

export type RenderDoor = {
  id: string;
  from: string;
  to: string;
  wall: "top" | "right" | "bottom" | "left";
  position: number;
  width: number;
  type: "door" | "sliding" | "open_passage";
};

export type RenderWindow = {
  id: string;
  zoneId: string;
  wall: "top" | "right" | "bottom" | "left";
  position: number;
  width: number;
  size: "small" | "medium" | "large";
  reason: string;
};

export type FurnitureHintType =
  | "sofa"
  | "dining_table"
  | "bed_double"
  | "bed_single"
  | "kitchen_counter"
  | "bath_fixture"
  | "grill"
  | "wardrobe";

export type FurnitureHint = {
  id: string;
  zoneId: string;
  type: FurnitureHintType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
};

export type RoomSlotMapping = {
  roomId: string;
  roomLabel: string;
  slotId: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type GeneratedPlan = {
  id: string;
  title: string;
  templateId: string;
  variantLabel: string;
  zones: RenderZone[];
  doors: RenderDoor[];
  windows: RenderWindow[];
  furniture: FurnitureHint[];
  metadata: {
    parti: string;
    templateName: string;
    mapping: RoomSlotMapping[];
    warnings: string[];
    notes: string[];
    coordinateSystem?: CoordinateSystem;
    areaEstimate?: AreaEstimate;
  };
};

export type HardAdjacencyGeometryCheck = {
  from: string;
  to: string;
  desiredConnection: string;
  satisfied: boolean;
  sharedWall: string | null;
  overlapLength: number;
  message: string;
};

export type DoorContactCheck = {
  doorId: string;
  from: string;
  to: string;
  type: string;
  wall: string;
  satisfied: boolean;
  sharedWall: string | null;
  overlapLength: number;
  message: string;
};

export type GeneratedPlanValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  infos: string[];
  architecturalIssues: ArchitecturalValidationIssue[];
  hardAdjacencyChecks: HardAdjacencyGeometryCheck[];
  doorContactChecks: DoorContactCheck[];
};
