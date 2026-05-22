import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan } from "./generatedPlan";
import {
  DEFAULT_MUTATION_TYPES,
  type MutatedPlanResult,
  type MutationType,
} from "./mutations";
import { findZoneByRoom } from "./planNormalize";
import {
  galleryModeledAsFurniture,
  hasLaundryVentilation,
  hasLaundryZone,
  hasSemiOutdoorGalleryZone,
  wetRoomsMaxOriginDistance,
} from "./planMetadata";
import { evaluateZoneDimensions } from "./dimensionalRules";
import {
  isBedroomRoom,
  isCoveredSpace,
  isFamilyHouseProgram,
  isWetServiceRoom,
  zoneCanvasArea,
} from "./spaceClassification";
import type { TopologyGraph } from "./topologyGraph";

export type PlanScorePenalties = {
  warnings: number;
  errors: number;
  skipped: number;
  invalidAdjacency: number;
  aspectRatio: number;
  excessiveMutation: number;
  missingLaundry: number;
  poorBedroomProportion: number;
  unknownOrientationDaylight: number;
  patioAsCovered: number;
  galleryAsFurniture: number;
  wetRoomsFar: number;
  noVentilation: number;
  laundryNoVentilation: number;
};

export type PlanScoreBreakdown = {
  total: number;
  adjacencyScore: number;
  daylightScore: number;
  socialOutdoorScore: number;
  privateWingScore: number;
  kitchenIntegrationScore: number;
  areaEfficiencyScore: number;
  wetCoreEfficiencyScore: number;
  ventilationScore: number;
  dimensionalQualityScore: number;
  orientationConfidenceScore: number;
  mutationIntentScore: number;
  penalties: PlanScorePenalties;
  reasons: string[];
};

export type ScoredPlanVariant = MutatedPlanResult & {
  score: PlanScoreBreakdown;
  rank?: number;
};

export type RecommendationStatus = "final" | "needs_improvement";

export type RecommendedNextStep = {
  type: "mutation_suggestion";
  mutationType: MutationType;
  reason: string;
};

export type PlanRecommendation = {
  bestVariantId: MutationType;
  bestVariantLabel: string;
  why: string[];
  tradeoffs: string[];
  recommendationStatus: RecommendationStatus;
  recommendedNextStep?: RecommendedNextStep;
};

export type IgnoredVariantSummary = {
  mutationType: MutationType;
  label: string;
  status: MutatedPlanResult["status"];
  eligibleForRanking: boolean;
  reason: string;
};

export type PlanScorerResult = {
  scoredVariants: ScoredPlanVariant[];
  topVariants: ScoredPlanVariant[];
  recommendedVariant: ScoredPlanVariant | null;
  recommendation: PlanRecommendation | null;
  stageOutput: {
    scoredCount: number;
    topCount: number;
    recommendedVariant: {
      mutationType: MutationType;
      label: string;
      totalScore: number;
    } | null;
    topVariants: Array<{
      rank: number;
      mutationType: MutationType;
      label: string;
      totalScore: number;
      adjacencyScore: number;
      daylightScore: number;
      socialOutdoorScore: number;
      privateWingScore: number;
      kitchenIntegrationScore: number;
      areaEfficiencyScore: number;
      mutationIntentScore: number;
      reasons: string[];
    }>;
    ignoredVariants: IgnoredVariantSummary[];
  };
};

export type ScorePlanVariantsParams = {
  program: ArchitecturalProgram;
  topologyGraph: TopologyGraph;
  referencePlan: GeneratedPlan;
  variants: MutatedPlanResult[];
  topN?: number;
};

const MAX_INDOOR_ASPECT = 3;
const TOP_N_DEFAULT = 3;

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(value * 10) / 10));
}

function clampTotal(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function isVariantScorable(variant: MutatedPlanResult): boolean {
  return (
    variant.eligibleForRanking &&
    variant.status === "ok" &&
    variant.validation.errors.length === 0 &&
    variant.validation.warnings.length === 0
  );
}

function ignoredReason(variant: MutatedPlanResult): string {
  if (variant.status === "skipped") {
    return "Mutación omitida (skipped).";
  }
  if (!variant.eligibleForRanking) {
    return "No elegible para ranking.";
  }
  if (variant.validation.errors.length > 0) {
    return "Tiene errores de validación.";
  }
  if (variant.validation.warnings.length > 0) {
    return "Tiene advertencias de validación.";
  }
  if (variant.status !== "ok") {
    return `Estado ${variant.status}.`;
  }
  return "No cumple criterios de puntuación.";
}

function zoneArea(plan: GeneratedPlan, roomId: string): number {
  const z = findZoneByRoom(plan.zones, roomId);
  return z ? z.width * z.height : 0;
}

function findDoor(plan: GeneratedPlan, a: string, b: string) {
  const x = norm(a);
  const y = norm(b);
  return plan.doors.find(
    (d) =>
      (norm(d.from) === x && norm(d.to) === y) ||
      (norm(d.from) === y && norm(d.to) === x),
  );
}

function hardCheck(
  variant: MutatedPlanResult,
  from: string,
  to: string,
) {
  const a = norm(from);
  const b = norm(to);
  return variant.validation.hardAdjacencyChecks.find(
    (c) =>
      (norm(c.from) === a && norm(c.to) === b) ||
      (norm(c.from) === b && norm(c.to) === a),
  );
}

function programPrioritiesText(program: ArchitecturalProgram): string {
  return program.priorities.join(" ").toLowerCase();
}

function scoreAdjacency(variant: MutatedPlanResult): {
  score: number;
  penalties: Partial<PlanScorePenalties>;
  reasons: string[];
} {
  const checks = variant.validation.hardAdjacencyChecks;
  if (checks.length === 0) {
    return { score: 18, penalties: {}, reasons: [] };
  }
  const satisfied = checks.filter((c) => c.satisfied).length;
  const unsatisfied = checks.length - satisfied;
  const score = clampScore((satisfied / checks.length) * 18, 18);
  const reasons: string[] = [];
  if (unsatisfied === 0) {
    reasons.push("Mantiene todas las adjacencias fuertes.");
  }
  return {
    score,
    penalties: { invalidAdjacency: unsatisfied },
    reasons,
  };
}

function scoreDaylight(variant: MutatedPlanResult): {
  score: number;
  reasons: string[];
} {
  let points = 0;
  const reasons: string[] = [];
  for (const w of variant.plan.windows) {
    const z = findZoneByRoom(variant.plan.zones, w.zoneId);
    if (!z) continue;
    if (z.type === "social") {
      if (w.size === "large") points += 6;
      else if (w.size === "medium") points += 4;
      else points += 2;
    } else if (z.type === "private") {
      if (w.size === "large") points += 4;
      else if (w.size === "medium") points += 3;
      else points += 1;
    } else if (z.type === "service" && norm(z.sourceRoomId) === "BANIO") {
      points += 1;
    }
  }
  const score = clampScore(points, 10);
  if (score >= 7) {
    reasons.push("Buena presencia de ventanas en living y dormitorios.");
  } else if (score >= 6) {
    reasons.push("Ventilación natural razonable en piezas principales.");
  }
  return { score, reasons };
}

function scoreSocialOutdoor(
  variant: MutatedPlanResult,
  referencePlan: GeneratedPlan,
): { score: number; reasons: string[] } {
  let points = 0;
  const reasons: string[] = [];
  const check = hardCheck(variant, "SALA_COMEDOR", "PATIO");
  if (check?.satisfied) {
    points += 8;
    const door = findDoor(variant.plan, "SALA_COMEDOR", "PATIO");
    if (door?.type === "sliding" || door?.type === "open_passage") {
      points += 4;
      reasons.push("Conexión living-patio fluida (paso amplio o corrediza).");
    } else if (door) {
      points += 2;
    }
    if (check.overlapLength >= 6) {
      points += 1;
    }
  }

  const patioArea = zoneArea(variant.plan, "PATIO");
  const refPatio = zoneArea(referencePlan, "PATIO");
  if (patioArea > refPatio) {
    points += 2;
    reasons.push("Patio con mayor presencia en la composición.");
  }

  if (hasSemiOutdoorGalleryZone(variant.plan)) {
    const salaGal = hardCheck(variant, "SALA_COMEDOR", "GALERIA");
    const galPatio = hardCheck(variant, "GALERIA", "PATIO");
    if (salaGal?.satisfied && galPatio?.satisfied) {
      points += 7;
      reasons.push(
        "Galería semi-cubierta conecta living → galería → patio.",
      );
    } else if (salaGal?.satisfied || galPatio?.satisfied) {
      points += 4;
      reasons.push("Galería de transición hacia el exterior.");
    }
  } else {
    const galleryNote = variant.plan.metadata.notes.some((n) =>
      /galer[ií]a/i.test(n),
    );
    if (galleryNote) {
      points += 1;
    }
  }

  if (variant.mutationType === "gallery_patio") {
    points += 2;
    reasons.push("Variante orientada a vida social al aire libre.");
  }

  return { score: clampScore(points, 15), reasons };
}

function scorePrivateWing(
  variant: MutatedPlanResult,
  topologyGraph: TopologyGraph,
): { score: number; reasons: string[] } {
  const distributorEdges = topologyGraph.edges.filter(
    (e) =>
      e.strength === "hard" &&
      (norm(e.from) === "DISTRIBUIDOR" || norm(e.to) === "DISTRIBUIDOR"),
  );
  let satisfied = 0;
  for (const edge of distributorEdges) {
    const other = norm(edge.from) === "DISTRIBUIDOR" ? edge.to : edge.from;
    if (hardCheck(variant, "DISTRIBUIDOR", other)?.satisfied) {
      satisfied += 1;
    }
  }
  const ratio =
    distributorEdges.length > 0 ? satisfied / distributorEdges.length : 1;
  let points = clampScore(ratio * 12, 12);

  const social = findZoneByRoom(variant.plan.zones, "SALA_COMEDOR");
  const privateRooms = variant.plan.zones.filter((z) => z.type === "private");
  let crossesSocial = false;
  if (social) {
    for (const bed of privateRooms) {
      const overlapsX =
        bed.x < social.x + social.width && bed.x + bed.width > social.x;
      const overlapsY =
        bed.y < social.y + social.height && bed.y + bed.height > social.y;
      if (overlapsX && overlapsY) {
        crossesSocial = true;
        break;
      }
    }
  }
  if (!crossesSocial) {
    points += 3;
  }

  const reasons: string[] = [];
  if (ratio >= 1) {
    reasons.push("Dormitorios agrupados alrededor del distribuidor.");
  }
  if (!crossesSocial) {
    reasons.push("Ala privada separada del núcleo social.");
  }

  return { score: clampScore(points, 12), reasons };
}

function scoreKitchenIntegration(variant: MutatedPlanResult): {
  score: number;
  reasons: string[];
} {
  let points = 0;
  const reasons: string[] = [];
  const check = hardCheck(variant, "SALA_COMEDOR", "COCINA");
  if (check?.satisfied) {
    points += 5;
  }
  const door = findDoor(variant.plan, "SALA_COMEDOR", "COCINA");
  if (door?.type === "open_passage") {
    points += 3;
    reasons.push("Cocina integrada con paso abierto al living.");
  }
  if (door && door.width >= 12) {
    points += 2;
  }
  return { score: clampScore(points, 7), reasons };
}

function scoreAreaEfficiency(
  variant: MutatedPlanResult,
  program: ArchitecturalProgram,
): { score: number; penalties: Partial<PlanScorePenalties>; reasons: string[] } {
  let points = 10;
  const penalties: Partial<PlanScorePenalties> = {};
  let aspectPenaltyCount = 0;

  for (const z of variant.plan.zones) {
    if (z.type === "outdoor" || z.type === "semi_outdoor") continue;
    const dim = evaluateZoneDimensions(z);
    if (dim.aspectExceeded) {
      aspectPenaltyCount += 1;
      points -= z.type === "private" ? 2 : 1;
    }
    if (dim.minimumDepthFailed) {
      points -= 1;
    }
    if (
      z.type !== "circulation" &&
      z.type !== "service" &&
      Math.min(z.width, z.height) < 8
    ) {
      points -= 1;
    }
  }

  if (aspectPenaltyCount > 0) {
    penalties.aspectRatio = aspectPenaltyCount;
  }

  const totalCanvasArea = variant.plan.zones.reduce(
    (sum, z) => sum + z.width * z.height,
    0,
  );
  if (program.targetAreaM2 && program.targetAreaM2 > 0) {
    const scale = 100;
    const approxM2 = totalCanvasArea / scale;
    const diff = Math.abs(approxM2 - program.targetAreaM2) / program.targetAreaM2;
    if (diff <= 0.15) {
      points += 1;
    } else if (diff > 0.35) {
      points -= 1;
    }
  }

  const reasons: string[] = [];
  if (points >= 8) {
    reasons.push("Proporciones de estancias equilibradas.");
  }

  return {
    score: clampScore(points, 10),
    penalties,
    reasons,
  };
}

function scoreMutationIntent(
  variant: MutatedPlanResult,
  program: ArchitecturalProgram,
): { score: number; reasons: string[] } {
  const priorities = programPrioritiesText(program);
  let points = 0;
  const reasons: string[] = [];
  const type = variant.mutationType;

  if (priorities.includes("cocina integrada") && type === "integrate_kitchen") {
    points += 4;
    reasons.push("Alineada con prioridad: cocina integrada.");
  }
  if (
    priorities.includes("patio como expansión social") &&
    (type === "expand_patio" || type === "gallery_patio")
  ) {
    points += 4;
    reasons.push("Alineada con prioridad: patio como expansión social.");
  }
  if (type === "gallery_patio" && priorities.includes("buena luz natural")) {
    points += 3;
    reasons.push("Galería y patio apoyan luz y expansión exterior.");
  }
  if (type === "add_compact_laundry") {
    points += 2;
    reasons.push("Incorpora lavadero compacto en núcleo húmedo.");
  }
  if (type === "add_laundry_as_kitchen_extension") {
    points += 5;
    reasons.push("Lavadero integrado a cocina con criterio de núcleo húmedo.");
  }
  if (type === "expand_social") {
    points += 3;
    if (priorities.includes("patio como expansión social")) {
      reasons.push("Refuerza el confort del área social conectada al patio.");
    }
  }
  if (priorities.includes("buena luz natural") && type !== "mirror_horizontal") {
    if (variant.plan.windows.some((w) => w.size === "large")) {
      points += 2;
    }
  }
  if (priorities.includes("dormitorios agrupados") && type === "base") {
    points += 1;
  }
  if (type === "mirror_horizontal") {
    points += 0.5;
  }
  if (type === "larger_master_bedroom") {
    points += 1;
  }
  if (type === "base") {
    points += 0;
  }

  return { score: clampScore(points, 8), reasons };
}

function scoreFromArchitecturalIssues(
  variant: MutatedPlanResult,
  program: ArchitecturalProgram,
): Partial<PlanScorePenalties> {
  const p: Partial<PlanScorePenalties> = {};
  for (const issue of variant.validation.architecturalIssues) {
    if (
      issue.code === "MISSING_LAUNDRY_FAMILY_HOME" &&
      !hasLaundryZone(variant.plan)
    ) {
      p.missingLaundry = isFamilyHouseProgram(program.rooms) ? 6 : 1;
    }
    if (issue.code === "BEDROOM_ASPECT_RATIO_HIGH") {
      p.poorBedroomProportion = (p.poorBedroomProportion ?? 0) + 1;
    }
    if (issue.code === "DAYLIGHT_ORIENTATION_UNKNOWN") {
      p.unknownOrientationDaylight = 1;
    }
    if (issue.code === "PATIO_COUNTED_AS_COVERED") p.patioAsCovered = 1;
    if (issue.code === "GALLERY_MODELED_AS_FURNITURE") {
      p.galleryAsFurniture = 1;
    }
    if (issue.code === "WET_CORE_TOO_DISTANT" || issue.code === "WET_ROOMS_TOO_FAR") {
      p.wetRoomsFar = 1;
    }
    if (issue.code === "ROOM_WITHOUT_NATURAL_VENTILATION") {
      const isLaundry = issue.affectedRoomIds.some((id) =>
        /LAVADERO|LAVANDER/i.test(id),
      );
      if (isLaundry) {
        p.laundryNoVentilation = 4;
      } else {
        p.noVentilation = (p.noVentilation ?? 0) + 1;
      }
    }
  }
  if (galleryModeledAsFurniture(variant.plan) && !hasSemiOutdoorGalleryZone(variant.plan)) {
    p.galleryAsFurniture = 1;
  }
  if (
    program.priorities.some((x) => /luz natural/i.test(x)) &&
    program.site.orientation === "unknown"
  ) {
    p.unknownOrientationDaylight = 1;
  }
  return p;
}

function scoreWetCore(variant: MutatedPlanResult): {
  score: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  const cocina = findZoneByRoom(variant.plan.zones, "COCINA");
  const banio = findZoneByRoom(variant.plan.zones, "BANIO");
  const lavadero = findZoneByRoom(variant.plan.zones, "LAVADERO");
  if (!cocina || !banio) return { score: 4, reasons };

  let score = 4;
  const dist =
    Math.abs(cocina.x - banio.x) + Math.abs(cocina.y - banio.y);
  if (dist < 25) score = 8;
  else if (dist < 40) score = 5;
  else score = 2;

  if (lavadero && cocina) {
    const dL =
      Math.abs(lavadero.x - cocina.x) + Math.abs(lavadero.y - cocina.y);
    if (dL < 20) score = Math.min(10, score + 2);
    if (hasLaundryVentilation(variant.plan)) {
      score = Math.min(10, score + 2);
      reasons.push("Lavadero ventilado adosado a cocina.");
    }
    const maxWet = wetRoomsMaxOriginDistance(variant.plan);
    if (maxWet <= 50) {
      score = Math.min(10, score + 1);
      reasons.push("Núcleo húmedo resuelto (cocina, baño y lavadero agrupados).");
    }
  }

  return { score: clampScore(score, 10), reasons };
}

function scoreVentilation(variant: MutatedPlanResult): number {
  let score = 8;
  const issues = variant.validation.architecturalIssues.filter(
    (i) => i.code === "ROOM_WITHOUT_NATURAL_VENTILATION",
  );
  score -= issues.length * 2;
  return clampScore(score, 8);
}

function scoreDimensionalQuality(variant: MutatedPlanResult): number {
  let score = 8;
  const bedroomIssues = variant.validation.architecturalIssues.filter(
    (i) => i.code === "BEDROOM_ASPECT_RATIO_HIGH",
  );
  score -= bedroomIssues.length * 2;
  for (const z of variant.plan.zones) {
    if (z.type === "semi_outdoor" || z.type === "outdoor") continue;
    const dim = evaluateZoneDimensions(z);
    if (dim.aspectExceeded && z.type === "private") score -= 2;
    else if (dim.aspectExceeded) score -= 0.5;
    if (dim.minimumDepthFailed) score -= 1;
  }
  return clampScore(score, 8);
}

function scoreOrientationConfidence(
  variant: MutatedPlanResult,
  program: ArchitecturalProgram,
): number {
  if (program.site.orientation !== "unknown") return 6;
  if (program.priorities.some((p) => /luz natural/i.test(p))) return 2;
  return 4;
}

function computePenalties(
  variant: MutatedPlanResult,
  partial: Partial<PlanScorePenalties>,
  program: ArchitecturalProgram,
): PlanScorePenalties {
  const arch = scoreFromArchitecturalIssues(variant, program);
  const penalties: PlanScorePenalties = {
    warnings: variant.validation.warnings.length,
    errors: variant.validation.errors.length,
    skipped: variant.status === "skipped" ? 1 : 0,
    invalidAdjacency: partial.invalidAdjacency ?? 0,
    aspectRatio: partial.aspectRatio ?? 0,
    excessiveMutation: 0,
    missingLaundry: arch.missingLaundry ?? 0,
    poorBedroomProportion: arch.poorBedroomProportion ?? 0,
    unknownOrientationDaylight: arch.unknownOrientationDaylight ?? 0,
    patioAsCovered: arch.patioAsCovered ?? 0,
    galleryAsFurniture: arch.galleryAsFurniture ?? 0,
    wetRoomsFar: arch.wetRoomsFar ?? 0,
    noVentilation: arch.noVentilation ?? 0,
    laundryNoVentilation: arch.laundryNoVentilation ?? 0,
  };

  if (
    variant.effect.changedZones.length >= 4 &&
    variant.mutationType !== "mirror_horizontal"
  ) {
    penalties.excessiveMutation = 1;
  }

  return penalties;
}

function penaltyTotal(penalties: PlanScorePenalties): number {
  return (
    penalties.warnings * 10 +
    penalties.errors * 30 +
    penalties.invalidAdjacency * 20 +
    penalties.aspectRatio * 5 +
    penalties.excessiveMutation * 5 +
    penalties.missingLaundry * 1 +
    penalties.poorBedroomProportion * 6 +
    penalties.unknownOrientationDaylight * 1 +
    penalties.patioAsCovered * 15 +
    penalties.galleryAsFurniture * 10 +
    penalties.wetRoomsFar * 8 +
    penalties.noVentilation * 5 +
    penalties.laundryNoVentilation * 1
  );
}

/** Única fuente del puntaje total publicado (subtotal − penalizaciones). */
export function computeFinalTotalScore(
  subtotal: number,
  penalties: PlanScorePenalties,
): number {
  return clampTotal(subtotal - penaltyTotal(penalties));
}

export function getFinalTotalScore(score: PlanScoreBreakdown): number {
  return score.total;
}

function buildReasons(parts: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of parts) {
    for (const r of list) {
      if (!seen.has(r)) {
        seen.add(r);
        out.push(r);
      }
      if (out.length >= 5) return out;
    }
  }
  return out;
}

export function scorePlanVariant(
  variant: MutatedPlanResult,
  params: {
    program: ArchitecturalProgram;
    topologyGraph: TopologyGraph;
    referencePlan: GeneratedPlan;
  },
): PlanScoreBreakdown {
  const adj = scoreAdjacency(variant);
  const day = scoreDaylight(variant);
  const social = scoreSocialOutdoor(variant, params.referencePlan);
  const priv = scorePrivateWing(variant, params.topologyGraph);
  const kitchen = scoreKitchenIntegration(variant);
  const area = scoreAreaEfficiency(variant, params.program);
  const intent = scoreMutationIntent(variant, params.program);
  const wetCoreResult = scoreWetCore(variant);
  const wetCore = wetCoreResult.score;
  const ventilation = scoreVentilation(variant);
  const dimensional = scoreDimensionalQuality(variant);
  const orientationConf = scoreOrientationConfidence(
    variant,
    params.program,
  );

  const partialPenalties: Partial<PlanScorePenalties> = {
    ...adj.penalties,
    ...area.penalties,
  };
  const penalties = computePenalties(
    variant,
    partialPenalties,
    params.program,
  );

  const subtotal =
    adj.score +
    day.score +
    social.score +
    priv.score +
    kitchen.score +
    area.score +
    wetCore +
    ventilation +
    dimensional +
    orientationConf +
    intent.score;

  const total = computeFinalTotalScore(subtotal, penalties);

  const reasons = buildReasons([
    adj.reasons,
    social.reasons,
    kitchen.reasons,
    priv.reasons,
    day.reasons,
    intent.reasons,
    area.reasons,
    wetCoreResult.reasons,
  ]);

  if (reasons.length === 0) {
    reasons.push("Variante válida con buen equilibrio general.");
  }

  return {
    total,
    adjacencyScore: adj.score,
    daylightScore: day.score,
    socialOutdoorScore: social.score,
    privateWingScore: priv.score,
    kitchenIntegrationScore: kitchen.score,
    areaEfficiencyScore: area.score,
    wetCoreEfficiencyScore: wetCore,
    ventilationScore: ventilation,
    dimensionalQualityScore: dimensional,
    orientationConfidenceScore: orientationConf,
    mutationIntentScore: intent.score,
    penalties,
    reasons,
  };
}

/** Variantes elegibles para el ranking final (post-scoring). */
export function isRankEligibleScoredVariant(variant: ScoredPlanVariant): boolean {
  return (
    variant.status === "ok" &&
    variant.eligibleForRanking === true &&
    Number.isFinite(variant.score?.total)
  );
}

export function compareScoredVariants(
  a: ScoredPlanVariant,
  b: ScoredPlanVariant,
): number {
  const totalA = getFinalTotalScore(a.score);
  const totalB = getFinalTotalScore(b.score);
  if (totalB !== totalA) return totalB - totalA;
  if (b.score.adjacencyScore !== a.score.adjacencyScore) {
    return b.score.adjacencyScore - a.score.adjacencyScore;
  }
  if (b.score.socialOutdoorScore !== a.score.socialOutdoorScore) {
    return b.score.socialOutdoorScore - a.score.socialOutdoorScore;
  }
  if (b.score.kitchenIntegrationScore !== a.score.kitchenIntegrationScore) {
    return b.score.kitchenIntegrationScore - a.score.kitchenIntegrationScore;
  }
  return (
    DEFAULT_MUTATION_TYPES.indexOf(a.mutationType) -
    DEFAULT_MUTATION_TYPES.indexOf(b.mutationType)
  );
}

/** Lista única ordenada por `score.total` final descendente; asigna `rank` en copias nuevas. */
export function buildFinalRankedVariants(
  scoredVariants: ScoredPlanVariant[],
): ScoredPlanVariant[] {
  return scoredVariants
    .filter(isRankEligibleScoredVariant)
    .slice()
    .sort(compareScoredVariants)
    .map((v, i) => ({
      ...v,
      rank: i + 1,
    }));
}

export type ScorerRankingOutputs = Pick<
  PlanScorerResult,
  "scoredVariants" | "topVariants" | "recommendedVariant"
>;

/** Deriva ranked list, top-N y recomendada desde la misma lista ya puntuada. */
export function deriveScorerRankingOutputs(
  scoredWithFinalTotals: ScoredPlanVariant[],
  topN: number,
): ScorerRankingOutputs {
  const scoredVariants = buildFinalRankedVariants(scoredWithFinalTotals);
  const topVariants = scoredVariants.slice(0, topN);
  const recommendedVariant = scoredVariants[0] ?? null;
  assertRankingInvariants(scoredVariants, topVariants, recommendedVariant, topN);
  return { scoredVariants, topVariants, recommendedVariant };
}

/** Invariantes de ranking (usado en tests y validación interna). */
export function assertRankingInvariants(
  scoredVariants: ScoredPlanVariant[],
  topVariants: ScoredPlanVariant[],
  recommendedVariant: ScoredPlanVariant | null,
  topN = TOP_N_DEFAULT,
): void {
  if (scoredVariants.length === 0) {
    if (recommendedVariant !== null || topVariants.length > 0) {
      throw new Error(
        "ranking invariant: empty scoredVariants requires null recommended and empty topVariants",
      );
    }
    return;
  }

  if (recommendedVariant !== scoredVariants[0]) {
    throw new Error(
      "ranking invariant: recommendedVariant must be scoredVariants[0]",
    );
  }

  const expectedTop = scoredVariants.slice(0, topN);
  if (
    topVariants.length !== expectedTop.length ||
    topVariants.some((v, i) => v.mutationType !== expectedTop[i]?.mutationType)
  ) {
    throw new Error(
      "ranking invariant: topVariants must equal scoredVariants.slice(0, topN)",
    );
  }

  for (let i = 0; i < scoredVariants.length; i++) {
    const v = scoredVariants[i]!;
    if (v.rank !== i + 1) {
      throw new Error(
        `ranking invariant: rank ${v.rank} at index ${i} (expected ${i + 1})`,
      );
    }
    if (!isRankEligibleScoredVariant(v)) {
      throw new Error(
        `ranking invariant: ineligible variant in scoredVariants: ${v.mutationType}`,
      );
    }
    if (i > 0) {
      const prev = scoredVariants[i - 1]!;
      if (getFinalTotalScore(prev.score) < getFinalTotalScore(v.score)) {
        throw new Error(
          "ranking invariant: scoredVariants not sorted by final totalScore descending",
        );
      }
    }
  }
}

function variantNeedsImprovement(
  top: ScoredPlanVariant,
  program: ArchitecturalProgram,
): boolean {
  if (isFamilyHouseProgram(program.rooms) && !hasLaundryZone(top.plan)) {
    return true;
  }
  return top.validation.architecturalIssues.some(
    (i) =>
      i.severity === "warning" && i.code === "MISSING_LAUNDRY_FAMILY_HOME",
  );
}

function buildRecommendation(
  top: ScoredPlanVariant,
  program: ArchitecturalProgram,
): PlanRecommendation {
  const needsImprovement = variantNeedsImprovement(top, program);
  const recommendation: PlanRecommendation = {
    bestVariantId: top.mutationType,
    bestVariantLabel: top.label,
    why: top.score.reasons.slice(0, 3),
    tradeoffs: [
      "Es una propuesta conceptual, no un plano técnico.",
      "La orientación solar real todavía no está definida.",
    ],
    recommendationStatus: needsImprovement ? "needs_improvement" : "final",
  };
  if (needsImprovement) {
    recommendation.recommendedNextStep = {
      type: "mutation_suggestion",
      mutationType: "add_laundry_as_kitchen_extension",
      reason:
        "El programa de casa familiar requiere lavadero ventilado; la extensión de cocina resuelve el núcleo húmedo sin sacrificar el puntaje global.",
    };
  }
  return recommendation;
}

export function scorePlanVariants(
  params: ScorePlanVariantsParams,
): PlanScorerResult {
  const topN = params.topN ?? TOP_N_DEFAULT;
  const ignoredVariants: IgnoredVariantSummary[] = [];
  const scorable: MutatedPlanResult[] = [];

  for (const v of params.variants) {
    if (isVariantScorable(v)) {
      scorable.push(v);
    } else {
      ignoredVariants.push({
        mutationType: v.mutationType,
        label: v.label,
        status: v.status,
        eligibleForRanking: v.eligibleForRanking,
        reason: ignoredReason(v),
      });
    }
  }

  const scoredWithFinalTotals: ScoredPlanVariant[] = scorable.map((v) => ({
    ...v,
    score: scorePlanVariant(v, {
      program: params.program,
      topologyGraph: params.topologyGraph,
      referencePlan: params.referencePlan,
    }),
  }));

  const { scoredVariants, topVariants, recommendedVariant } =
    deriveScorerRankingOutputs(scoredWithFinalTotals, topN);

  const recommendation = recommendedVariant
    ? buildRecommendation(recommendedVariant, params.program)
    : null;

  return {
    scoredVariants,
    topVariants,
    recommendedVariant,
    recommendation,
    stageOutput: {
      scoredCount: scoredVariants.length,
      topCount: topVariants.length,
      recommendedVariant: recommendedVariant
        ? {
            mutationType: recommendedVariant.mutationType,
            label: recommendedVariant.label,
            totalScore: recommendedVariant.score.total,
          }
        : null,
      topVariants: topVariants.map((v) => ({
        rank: v.rank!,
        mutationType: v.mutationType,
        label: v.label,
        totalScore: v.score.total,
        adjacencyScore: v.score.adjacencyScore,
        daylightScore: v.score.daylightScore,
        socialOutdoorScore: v.score.socialOutdoorScore,
        privateWingScore: v.score.privateWingScore,
        kitchenIntegrationScore: v.score.kitchenIntegrationScore,
        areaEfficiencyScore: v.score.areaEfficiencyScore,
        mutationIntentScore: v.score.mutationIntentScore,
        reasons: v.score.reasons,
      })),
      ignoredVariants,
    },
  };
}
