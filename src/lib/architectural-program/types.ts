export const PROGRAM_ZONE_TYPES = [
  "circulation",
  "social",
  "service",
  "private",
  "outdoor",
] as const;

export type ProgramZoneType = (typeof PROGRAM_ZONE_TYPES)[number];

export const EXTERIOR_ANCHORS = ["front", "back", "any", "none"] as const;

export type ExteriorAnchor = (typeof EXTERIOR_ANCHORS)[number];

export const TOPOLOGY_STRENGTHS = [
  "critical",
  "strong",
  "medium",
  "soft",
] as const;

export type TopologyStrength = (typeof TOPOLOGY_STRENGTHS)[number];

export type ProgrammaticZone = {
  id: string;
  label: string;
  type: ProgramZoneType;
  idealAreaM2: number;
  aspectRatioRange: [number, number];
  exteriorAnchor: ExteriorAnchor;
  priority?: number;
  minAreaM2?: number;
};

export type TopologyEdge = {
  from: string;
  to: string;
  relation: string;
  strength: TopologyStrength;
  reason?: string;
};

export type ProgramQualityWeights = {
  circulation?: number;
  privacy?: number;
  light?: number;
  ventilation?: number;
  patioConnection?: number;
  wetCoreEfficiency?: number;
  briefFit?: number;
};

export type ArchitecturalProgramGlobalConfig = {
  targetTotalAreaM2: number;
  allowanceFactor: number;
  areaStrategy?: "compact" | "balanced" | "generous";
  notes?: string;
};

/** Programa espacial validado — entrada del adaptador geométrico. */
export type ArchitecturalProgram = {
  title: string;
  globalConfig: ArchitecturalProgramGlobalConfig;
  programmaticZones: ProgrammaticZone[];
  topologyGraph: TopologyEdge[];
  architecturalRules?: Record<string, unknown>;
  qualityWeights?: ProgramQualityWeights;
  assumptions?: string[];
  openQuestions?: string[];
};

export const DEFAULT_ALLOWANCE_FACTOR = 1.15;
