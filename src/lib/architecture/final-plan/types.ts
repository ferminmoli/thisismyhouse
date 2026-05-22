import type { RoomType } from "../architecturalProgram";
import type { SpaceEnclosure } from "../spaceClassification";

export type WallSide = "top" | "right" | "bottom" | "left";

export type WetRoomKind = "none" | "bathroom" | "kitchen" | "laundry" | "service";

/** Public stroke weight — perimeter vs shared interior edge (zone-level, not wall graph). */
export type RoomBoundaryRole = "perimeter" | "interior" | "outdoor" | "semi";

export type PlanRoom = {
  /** Internal — never rendered in public SVG */
  id: string;
  displayName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  enclosure: SpaceEnclosure;
  zoneType: RoomType;
  wetKind: WetRoomKind;
  boundaryRole: RoomBoundaryRole;
  areaM2: number | null;
  areaIsEstimated: boolean;
};

export type WallSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: "exterior" | "interior";
  /** Patio / exterior boundary */
  dashed?: boolean;
  /** Dev-only label (e.g. ext-0, int-2) */
  debugId?: string;
};

export type OpeningKind =
  | "hinged"
  | "sliding"
  | "passage"
  | "wide_sliding";

export type PlanOpening = {
  id: string;
  kind: OpeningKind;
  wall: WallSide;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Hinge at (hingeX, hingeY) for swing arcs */
  hingeX: number;
  hingeY: number;
  swingRadius: number;
  /** Arc path for hinged doors */
  swingArcD?: string;
  leafX: number;
  leafY: number;
  connectsOutdoor: boolean;
  connectsSemiOutdoor: boolean;
};

export type PlanWindow = {
  id: string;
  wall: WallSide;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Inner parallel line (glass) */
  ix1: number;
  iy1: number;
  ix2: number;
  iy2: number;
};

export type PlanFurniture = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type PlanLabel = {
  roomId: string;
  name: string;
  areaText: string | null;
  x: number;
  y: number;
  nameY: number;
  areaY: number;
  nameSize: number;
  areaSize: number;
  /** Compact callout for tiny rooms */
  callout?: boolean;
};

export type PlanDimension = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  ext1: { x1: number; y1: number; x2: number; y2: number };
  ext2: { x1: number; y1: number; x2: number; y2: number };
  label: string;
  labelX: number;
  labelY: number;
  rotation: 0 | 90;
};

export type SheetMeta = {
  projectTitle: string;
  variantLabel: string;
  coveredM2: number | null;
  outdoorM2: number | null;
  semiCoveredM2: number | null;
  areasEstimated: boolean;
  showGraphicScale: boolean;
  showPreliminaryDimensions: boolean;
};

export type PlanLayout = {
  sheetWidth: number;
  sheetHeight: number;
  planAreaX: number;
  planAreaY: number;
  planAreaW: number;
  planAreaH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ArchitecturalPlanViewModel = {
  variantId: string;
  variantLabel: string;
  title: string;
  rooms: PlanRoom[];
  walls: WallSegment[];
  openings: PlanOpening[];
  windows: PlanWindow[];
  furniture: PlanFurniture[];
  labels: PlanLabel[];
  dimensions: PlanDimension[];
  layout: PlanLayout;
  sheet: SheetMeta;
  showOrientativeNorth: boolean;
  showFurniture: boolean;
};

export type BuildViewModelInput = {
  variantId: string;
  variantLabel: string;
  title?: string;
  showFurniture?: boolean;
  orientationKnown?: boolean;
  /** Dev/admin wall graph experiment — must be gated in UI. */
  wallGraphDebug?: boolean;
};

export type RenderArchitecturalPlanOptions = {
  wallGraphDebug?: boolean;
};
