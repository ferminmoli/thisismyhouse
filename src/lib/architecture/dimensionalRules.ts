import type { RenderZone } from "./generatedPlan";

export type DimensionalRuleSetId =
  | "bedroom_private"
  | "social_flexible"
  | "service_compact"
  | "circulation_elongated"
  | "outdoor_flexible"
  | "gallery_transition"
  | "default_indoor";

export type DimensionalRuleApplied = {
  zoneType: RenderZone["type"];
  ruleSet: DimensionalRuleSetId;
  aspectRatioPenalty: boolean;
  minimumDepthCheck: boolean;
  maxAspectRatio: number;
};

const MAX_BEDROOM_ASPECT = 2.2;
const MAX_SOCIAL_ASPECT = 3.5;
const MAX_SERVICE_ASPECT = 3;
const MAX_CIRCULATION_ASPECT = 5;
const MAX_OUTDOOR_ASPECT = 6;
const GALLERY_MIN_DEPTH = 3;

export function ruleSetForZone(z: RenderZone): DimensionalRuleSetId {
  if (z.type === "semi_outdoor" && /GALERIA|GALERÍA/i.test(z.sourceRoomId)) {
    return "gallery_transition";
  }
  if (z.type === "private") return "bedroom_private";
  if (z.type === "social") return "social_flexible";
  if (z.type === "service") return "service_compact";
  if (z.type === "circulation") return "circulation_elongated";
  if (z.type === "outdoor") return "outdoor_flexible";
  return "default_indoor";
}

export function maxAspectForRuleSet(ruleSet: DimensionalRuleSetId): number {
  switch (ruleSet) {
    case "bedroom_private":
      return MAX_BEDROOM_ASPECT;
    case "social_flexible":
      return MAX_SOCIAL_ASPECT;
    case "service_compact":
      return MAX_SERVICE_ASPECT;
    case "circulation_elongated":
      return MAX_CIRCULATION_ASPECT;
    case "outdoor_flexible":
      return MAX_OUTDOOR_ASPECT;
    case "gallery_transition":
      return 50;
    default:
      return 3;
  }
}

export function aspectRatioPenaltyApplies(z: RenderZone): boolean {
  const ruleSet = ruleSetForZone(z);
  return ruleSet !== "gallery_transition" && ruleSet !== "outdoor_flexible";
}

export function evaluateZoneDimensions(z: RenderZone): {
  aspect: number;
  aspectExceeded: boolean;
  minimumDepthFailed: boolean;
  rule: DimensionalRuleApplied;
} {
  const ruleSet = ruleSetForZone(z);
  const aspect =
    Math.max(z.width, z.height) / Math.min(z.width, z.height);
  const maxAspect = maxAspectForRuleSet(ruleSet);
  const aspectExceeded =
    aspectRatioPenaltyApplies(z) && aspect > maxAspect;
  const minimumDepthFailed =
    ruleSet === "gallery_transition" &&
    Math.min(z.width, z.height) < GALLERY_MIN_DEPTH;

  return {
    aspect,
    aspectExceeded,
    minimumDepthFailed,
    rule: {
      zoneType: z.type,
      ruleSet,
      aspectRatioPenalty: aspectRatioPenaltyApplies(z),
      minimumDepthCheck: ruleSet === "gallery_transition",
      maxAspectRatio: maxAspect,
    },
  };
}

export function collectDimensionalRulesApplied(
  zones: RenderZone[],
): DimensionalRuleApplied[] {
  const seen = new Set<DimensionalRuleSetId>();
  const out: DimensionalRuleApplied[] = [];
  for (const z of zones) {
    const { rule } = evaluateZoneDimensions(z);
    if (seen.has(rule.ruleSet)) continue;
    seen.add(rule.ruleSet);
    out.push(rule);
  }
  return out;
}
