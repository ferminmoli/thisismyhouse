import type { ZoneType } from "@/lib/types";

/** Input contract — no fixed x/y per zone. */
export type ConstraintLot = {
  width: number;
  height: number;
};

export type AspectRatioRange = readonly [min: number, max: number];

export type ConstraintZoneSpec = {
  id: string;
  label: string;
  type: ZoneType;
  /** Target area in lot units² (same unit system as lot width×height). */
  idealArea: number;
  aspectRatioRange: AspectRatioRange;
  description?: string;
  group?: string;
  priority?: string;
};

export type AdjacencyConnectionType = "shared_wall" | "door_connection";

export type ConstraintAdjacency = {
  from: string;
  to: string;
  type: AdjacencyConnectionType;
  reason?: string;
};

export type ConstraintPlanInput = {
  layoutVersion: "constraint";
  title: string;
  disclaimer: string;
  inputSummary: string;
  assumptions?: string[];
  explanation?: string;
  architectQuestions?: string[];
  lot: ConstraintLot;
  zones: ConstraintZoneSpec[];
  adjacencies: ConstraintAdjacency[];
};

/** Absolute geometry in lot coordinate space. */
export type PlacedZone = {
  id: string;
  label: string;
  type: ZoneType;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  aspectRatioRange: AspectRatioRange;
  description?: string;
  group?: string;
};

export type SharedWallSegment = {
  from: string;
  to: string;
  /** Wall on `from` zone */
  wallFrom: "top" | "bottom" | "left" | "right";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  along: "h" | "v";
  length: number;
};

export type AutoDoorPlacement = {
  id: string;
  from: string;
  to: string;
  wall: "top" | "bottom" | "left" | "right";
  position: number;
  width: number;
  type: "door" | "open_passage";
};

export type LayoutEngineMetrics = {
  iterations: number;
  overlapCount: number;
  adjacencySatisfied: number;
  adjacencyTotal: number;
  treemapFill: number;
};

export type LayoutEngineResult = {
  zones: PlacedZone[];
  doors: AutoDoorPlacement[];
  sharedWalls: SharedWallSegment[];
  metrics: LayoutEngineMetrics;
  warnings: string[];
};

export type LayoutEngineOptions = {
  /** Relaxation iterations after treemap (default 72). */
  relaxationIterations?: number;
  /** Snap grid in lot units (default 0.5). */
  grid?: number;
  /** Semilla: baraja orden de zonas en treemap inicial (variantes). */
  treemapSeed?: number;
  /** Semilla opcional para jitter en relajación (reservado). */
  relaxationSeed?: number;
};
