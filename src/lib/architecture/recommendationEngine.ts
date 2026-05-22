import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan } from "./generatedPlan";
import { hasLaundryZone } from "./planMetadata";
import {
  scorePlanVariants,
  type PlanRecommendation,
  type PlanScorerResult,
  type RecommendedNextStep,
  type ScoredPlanVariant,
} from "./planScorer";
import { isFamilyHouseProgram } from "./spaceClassification";
import type { MutationType } from "./mutations";
import type { TopologyGraph } from "./topologyGraph";
import type { MutatedPlanResult } from "./mutations";
import {
  briefPriorityScore,
  buildSelectionMethod,
  detectPromptLanguage,
  NEAR_TIE_THRESHOLD,
  type SelectionMethod,
} from "./prioritySelection";

/** @deprecated Use briefPriorityScore — alias para tests y compatibilidad. */
export const priorityTieBoost = briefPriorityScore;

export type ConfidenceLevel = "low" | "medium" | "high" | "medium_low";

export type RecommendationConfidence = {
  overall: ConfidenceLevel;
  reasons: string[];
};

export type ProfessionalReview = {
  required: boolean;
  mustReview: string[];
};

export type EnrichedPlanRecommendation = PlanRecommendation & {
  confidence: RecommendationConfidence;
  professionalReview: ProfessionalReview;
  selectionMethod: SelectionMethod;
  narrativeSummary: string;
};

export type RecommendationEngineStageOutput =
  PlanScorerResult["stageOutput"] & {
    selectionMethod: SelectionMethod | null;
    nearTieThreshold: number;
    narrativeSummary: string | null;
    recommendationStatus: PlanRecommendation["recommendationStatus"] | null;
    recommendedNextStep: RecommendedNextStep | null;
  };

export type RecommendationEngineResult = Omit<
  PlanScorerResult,
  "stageOutput" | "recommendation"
> & {
  recommendation: EnrichedPlanRecommendation | null;
  stageOutput: RecommendationEngineStageOutput;
};

function buildConfidence(
  program: ArchitecturalProgram,
  top: ScoredPlanVariant,
): RecommendationConfidence {
  const reasons: string[] = [];
  let level: ConfidenceLevel = "medium";

  if (top.validation.hardAdjacencyChecks.every((c) => c.satisfied)) {
    reasons.push(
      "El esquema conceptual cumple las adjacencias fuertes del programa.",
    );
  }

  reasons.push(
    "La separación cubierto / semi-cubierto / exterior está explícita en metadatos.",
  );

  const orientationUnknown = program.site.orientation === "unknown";
  const lotUnknown = program.site.lotShape === "unknown";

  if (orientationUnknown) {
    reasons.push(
      "La orientación es desconocida; la calidad de luz natural no puede validarse por completo.",
    );
  }
  if (lotUnknown) {
    reasons.push(
      "Las dimensiones del lote son desconocidas; la constructibilidad real no está garantizada.",
    );
  }

  const archWarns = top.validation.architecturalIssues.filter(
    (i) => i.severity === "warning",
  ).length;
  const hasErrors = top.validation.errors.length > 0;

  if (hasErrors || archWarns > 4) {
    level = "low";
  } else if (
    orientationUnknown &&
    lotUnknown &&
    top.validation.ok &&
    top.status === "ok"
  ) {
    level = "medium_low";
  } else if (orientationUnknown || lotUnknown) {
    level = "medium";
  }

  if (
    !orientationUnknown &&
    !lotUnknown &&
    program.targetAreaM2 &&
    archWarns <= 1
  ) {
    level = "high";
  }

  return { overall: level, reasons };
}

function buildProfessionalReview(lang: "es" | "en"): ProfessionalReview {
  if (lang === "es") {
    return {
      required: true,
      mustReview: [
        "orientación solar",
        "medidas reales del lote",
        "normativa municipal",
        "estructura",
        "instalaciones (plomería y gas)",
        "ventilación natural",
        "superficie cubierta vs exterior",
      ],
    };
  }
  return {
    required: true,
    mustReview: [
      "solar orientation",
      "real lot dimensions",
      "municipal code",
      "structure",
      "plumbing",
      "natural ventilation",
      "covered vs outdoor area",
    ],
  };
}

export function buildNarrativeSummary(
  recommendation: EnrichedPlanRecommendation,
  program: ArchitecturalProgram,
  userPrompt: string,
): string {
  const lang = detectPromptLanguage(userPrompt);
  const label = recommendation.bestVariantLabel;
  const why = recommendation.why.slice(0, 2).join(" ");

  if (lang === "es") {
    const laundryHint =
      recommendation.bestVariantId === "add_laundry_as_kitchen_extension"
        ? "Completa el programa de casa familiar con lavadero ventilado adosado a cocina, "
        : "";
    const priorityHint =
      recommendation.bestVariantId === "expand_patio" ||
      recommendation.bestVariantId === "gallery_patio"
        ? "refuerza la relación entre el área social y el patio/exterior según el brief, "
        : "";
    return (
      `Recomendamos la variante ${label} porque obtuvo el mayor puntaje arquitectónico (${recommendation.selectionMethod.reason}) ` +
      `y ${why} ${laundryHint}${priorityHint}` +
      "sin pretender ser un plano técnico definitivo. Un arquitecto debe validar orientación, medidas reales del lote, normativa municipal, estructura, ventilación natural e instalaciones antes de avanzar."
    );
  }

  return (
    `We recommend the ${label} variant because ${why} ` +
    `This is still a conceptual sketch: an architect should validate orientation, lot dimensions, ` +
    `code compliance, structure, and plumbing before moving forward.`
  );
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

function buildRecommendedNextStep(
  top: ScoredPlanVariant,
  program: ArchitecturalProgram,
  userPrompt: string,
): RecommendedNextStep | undefined {
  if (!variantNeedsImprovement(top, program)) return undefined;

  const lang = detectPromptLanguage(userPrompt);
  const reason =
    lang === "es"
      ? "El programa de casa familiar requiere lavadero ventilado; la extensión de cocina completa el núcleo húmedo."
      : "Family-home program requires ventilated laundry; kitchen extension completes the wet core.";

  return {
    type: "mutation_suggestion",
    mutationType: "add_laundry_as_kitchen_extension" as MutationType,
    reason,
  };
}

function buildEnrichedRecommendation(
  top: ScoredPlanVariant,
  program: ArchitecturalProgram,
  selectionMethod: SelectionMethod,
  userPrompt: string,
): EnrichedPlanRecommendation {
  const lang = detectPromptLanguage(userPrompt);
  const tradeoffs = [
    lang === "es"
      ? "Es una propuesta conceptual, no un plano técnico."
      : "This is a conceptual proposal, not a technical plan.",
    lang === "es"
      ? "La orientación solar real todavía no está definida."
      : "Actual solar orientation is not yet defined.",
  ];

  if (top.mutationType === "gallery_patio") {
    tradeoffs.push(
      lang === "es"
        ? "La galería puede atenuar sol directo de invierno según orientación (desconocida)."
        : "Gallery may reduce direct winter sun depending on orientation (unknown).",
    );
  }

  const base: PlanRecommendation = {
    bestVariantId: top.mutationType,
    bestVariantLabel: top.label,
    why: top.score.reasons.slice(0, 3),
    tradeoffs,
    recommendationStatus: variantNeedsImprovement(top, program)
      ? "needs_improvement"
      : "final",
    recommendedNextStep: buildRecommendedNextStep(top, program, userPrompt),
  };

  const confidence = buildConfidence(program, top);
  const professionalReview = buildProfessionalReview(lang);
  const enriched: EnrichedPlanRecommendation = {
    ...base,
    confidence,
    professionalReview,
    selectionMethod,
    narrativeSummary: "",
  };
  enriched.narrativeSummary = buildNarrativeSummary(
    enriched,
    program,
    userPrompt,
  );
  return enriched;
}

export type RunRecommendationEngineParams = {
  program: ArchitecturalProgram;
  topologyGraph: TopologyGraph;
  referencePlan: GeneratedPlan;
  variants: MutatedPlanResult[];
  topN?: number;
  userPrompt?: string;
};

export function runRecommendationEngine(
  params: RunRecommendationEngineParams,
): RecommendationEngineResult {
  const scorerResult = scorePlanVariants({
    program: params.program,
    topologyGraph: params.topologyGraph,
    referencePlan: params.referencePlan,
    variants: params.variants,
    topN: params.topN,
  });

  const { scoredVariants, topVariants, recommendedVariant } = scorerResult;
  const selectionMethod = buildSelectionMethod(scoredVariants);
  const userPrompt = params.userPrompt ?? params.program.inputSummary;

  const recommendation =
    recommendedVariant && selectionMethod
      ? buildEnrichedRecommendation(
          recommendedVariant,
          params.program,
          selectionMethod,
          userPrompt,
        )
      : null;

  return {
    ...scorerResult,
    recommendation,
    stageOutput: {
      ...scorerResult.stageOutput,
      selectionMethod: selectionMethod ?? null,
      nearTieThreshold: NEAR_TIE_THRESHOLD,
      narrativeSummary: recommendation?.narrativeSummary ?? null,
      recommendationStatus: recommendation?.recommendationStatus ?? null,
      recommendedNextStep: recommendation?.recommendedNextStep ?? null,
    },
  };
}
