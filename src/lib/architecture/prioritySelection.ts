import type { ArchitecturalProgram } from "./architecturalProgram";
import type { MutationType } from "./mutations";
import {
  buildFinalRankedVariants,
  type ScoredPlanVariant,
} from "./planScorer";

export const NEAR_TIE_THRESHOLD = 2;

/** Mutaciones de corrección programática (lavadero, etc.). */
export const PROGRAM_FIX_MUTATIONS: MutationType[] = [
  "add_compact_laundry",
  "add_laundry_as_kitchen_extension",
];

export function isProgramFixMutation(type: MutationType): boolean {
  return PROGRAM_FIX_MUTATIONS.includes(type);
}

export type SelectionMethod = {
  rawTopVariant: MutationType;
  finalRecommendedVariant: MutationType;
  nearTieApplied: boolean;
  nearTieThreshold: number;
  reason: string;
};

export function programPrioritiesText(program: ArchitecturalProgram): string {
  return program.priorities.join(" ").toLowerCase();
}

/** Alineación con prioridades del brief (independiente del puntaje numérico). */
export function briefPriorityScore(
  mutationType: MutationType,
  priorities: string,
): number {
  const pri = priorities.toLowerCase();
  let score = 0;

  const hasPatio =
    pri.includes("patio como expansión social") || pri.includes("patio");
  const hasLight = pri.includes("buena luz natural") || pri.includes("luz natural");
  const hasKitchen = pri.includes("cocina integrada");
  const hasPrivate = pri.includes("dormitorios agrupados");

  if (hasPatio || hasLight) {
    if (mutationType === "expand_patio") score += 30;
    if (mutationType === "gallery_patio") score += 28;
    if (mutationType === "expand_social") score += 24;
    if (mutationType === "integrate_kitchen") score += 10;
  } else if (hasKitchen && mutationType === "integrate_kitchen") {
    score += 28;
  }

  if (hasKitchen && !hasPatio && !hasLight && mutationType === "integrate_kitchen") {
    score += 28;
  } else if (hasKitchen && mutationType === "integrate_kitchen") {
    score += 14;
  }

  if (hasPrivate) {
    if (mutationType === "base") score += 8;
    if (mutationType === "larger_master_bedroom") score += 5;
    if (mutationType === "compact_private_wing") score += 2;
  }

  if (mutationType === "add_compact_laundry") score += 6;
  if (mutationType === "add_laundry_as_kitchen_extension") score += 5;

  return score;
}

export function buildSelectionMethod(
  ranked: ScoredPlanVariant[],
): SelectionMethod | null {
  if (ranked.length === 0) return null;

  const winner = ranked[0]!;
  const topScore = winner.score.total;
  const contenders = ranked.filter(
    (v) => topScore - v.score.total <= NEAR_TIE_THRESHOLD,
  );

  let reason =
    "Recomendada por mayor puntaje total tras validación, con ranking único por score.";
  if (contenders.length > 1) {
    const types = contenders.map((v) => v.mutationType).join(", ");
    reason =
      `Varias variantes dentro de ${NEAR_TIE_THRESHOLD} puntos (${types}); ` +
      "se elige la de mayor puntaje total y desempate por criterios secundarios del scorer.";
  }

  return {
    rawTopVariant: winner.mutationType,
    finalRecommendedVariant: winner.mutationType,
    nearTieApplied: contenders.length > 1,
    nearTieThreshold: NEAR_TIE_THRESHOLD,
    reason,
  };
}

/** Ranking y recomendación alineados con `buildFinalRankedVariants` (solo por score). */
export function selectFinalRecommendation(
  scoredVariants: ScoredPlanVariant[],
  _program?: ArchitecturalProgram,
): {
  finalVariant: ScoredPlanVariant | null;
  selectionMethod: SelectionMethod | null;
  ranked: ScoredPlanVariant[];
} {
  const ranked = buildFinalRankedVariants(scoredVariants);
  if (ranked.length === 0) {
    return { finalVariant: null, selectionMethod: null, ranked: [] };
  }

  return {
    finalVariant: ranked[0]!,
    selectionMethod: buildSelectionMethod(ranked),
    ranked,
  };
}

export function detectPromptLanguage(
  userPrompt: string,
): "es" | "en" {
  const t = userPrompt.toLowerCase();
  if (
    /casa|dormitorio|baño|baño|patio|m²|m2|buena luz|comedor|distribución|planta/i.test(
      t,
    )
  ) {
    return "es";
  }
  return "en";
}
