export const ARCHITECTURAL_PROGRAM_DISCLAIMER =
  "This is a conceptual sketch for discussion only. An architect must validate and design the actual project.";

export type RoomType =
  | "social"
  | "private"
  | "service"
  | "circulation"
  | "outdoor"
  | "semi_outdoor"
  | "work"
  | "flex";

export type SpaceEnclosureKind = "covered" | "semi_covered" | "outdoor";

export type ProgramRoom = {
  id: string;
  label: string;
  type: RoomType;
  required: boolean;
  priority: "low" | "medium" | "high";
  idealAreaM2?: number;
  notes?: string;
};

export type Adjacency = {
  from: string;
  to: string;
  reason: string;
  strength: "hard" | "soft";
};

export type SiteInfo = {
  lotShape: "rectangular" | "narrow" | "wide" | "irregular" | "unknown";
  accessSide: "front" | "side" | "unknown";
  orientation: "north" | "south" | "east" | "west" | "unknown";
};

/** Forma arquitectónica deseada del proyecto (parti), no la forma del lote. */
export type DesiredPlanShape =
  | "l_shape"
  | "linear"
  | "compact"
  | "central_patio"
  | "two_wing"
  | "unknown";

export type ArchitecturalProgram = {
  title: string;
  disclaimer: string;
  inputSummary: string;
  targetAreaM2?: number;
  floorCount: number;
  desiredPlanShape?: DesiredPlanShape;
  rooms: ProgramRoom[];
  priorities: string[];
  lifestyle: string[];
  styleKeywords: string[];
  site: SiteInfo;
  hardAdjacencies: Adjacency[];
  softAdjacencies: Adjacency[];
  architectQuestions: string[];
  limitations: string[];
};

export type LlmProgramExtractorResult = {
  program: ArchitecturalProgram;
  mock: boolean;
  model: string;
  rawJson: string;
  warnings: string[];
};
