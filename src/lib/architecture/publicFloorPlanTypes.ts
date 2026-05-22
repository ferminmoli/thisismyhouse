import type { RecommendationConfidence } from "./recommendationEngine";

export type PublicConfidenceLevel = RecommendationConfidence["overall"];

export type PublicZone = {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  estimatedAreaM2?: number;
  areaKind?: "covered" | "outdoor" | "semi_covered";
};

export type PublicDoor = {
  id: string;
  from: string;
  to: string;
  type: string;
  wall: string;
  position: number;
  width: number;
};

export type PublicWindow = {
  id: string;
  zoneId: string;
  wall: string;
  position: number;
  width: number;
  size?: string;
  reason?: string;
};

export type PublicFurniture = {
  id: string;
  zoneId: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PublicAreaEstimate = {
  coveredM2?: number;
  outdoorM2?: number;
  semiCoveredM2?: number;
  totalM2?: number;
  confidence?: string;
};

export type PublicPlanGeometry = {
  id: string;
  title: string;
  templateId?: string;
  variantLabel?: string;
  zones: PublicZone[];
  doors: PublicDoor[];
  windows: PublicWindow[];
  furniture: PublicFurniture[];
  areaEstimate?: PublicAreaEstimate;
};

export type PublicFloorPlanVariant = {
  id: string;
  label: string;
  description: string;
  rank?: number;
  score?: number;
  plan: PublicPlanGeometry;
  highlights: string[];
};

export type PublicArchitectBrief = {
  summary: string;
  keyDecisions: string[];
  areas: {
    coveredM2?: number;
    outdoorM2?: number;
    semiCoveredM2?: number;
    totalM2?: number;
  };
  rooms: {
    id: string;
    label: string;
    type: string;
    estimatedAreaM2?: number;
    areaKind?: string;
  }[];
  warnings: string[];
  nextSteps: string[];
};

export type PublicVisualInspiration = {
  prompt: string;
  notes: string[];
};

export type PublicConfidence = {
  level: PublicConfidenceLevel;
  reasons: string[];
};

export type PublicProfessionalReview = {
  required: boolean;
  items: string[];
};

/** Curated payload for product UI (no scorer/validation internals). */
export type PublicFloorPlanResult = {
  title: string;
  recommendedVariant: PublicFloorPlanVariant;
  topVariants: PublicFloorPlanVariant[];
  whyRecommended: string[];
  confidence: PublicConfidence;
  professionalReview: PublicProfessionalReview;
  architectBrief: PublicArchitectBrief;
  visualInspiration?: PublicVisualInspiration;
  disclaimer: string;
};

/** Debug bundle for dev/admin only. */
export type FloorPlanDebug = {
  requestId?: string;
  stages?: unknown[];
  rawVariants?: unknown[];
  scoredVariants?: unknown[];
  validation?: unknown;
  selectionMethod?: unknown;
  timings?: unknown;
  architecturalIssues?: unknown[];
  warnings?: unknown[];
  plansById?: unknown;
  recommendationRaw?: unknown;
  rawOutput?: unknown;
};

export type PresentedFloorPlanResult = {
  publicResult: PublicFloorPlanResult;
  debug?: FloorPlanDebug;
};

export type PresentFloorPlanPipelineOptions = {
  requestId: string;
  includeDebug?: boolean;
  isAdmin?: boolean;
  isDev?: boolean;
  topN?: number;
};
