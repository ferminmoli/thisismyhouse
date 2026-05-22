import type { GeneratedPlan, RenderZone } from "./generatedPlan";
import type { MutatedPlanResult } from "./mutations";
import type { PipelineInternalResult } from "./generationPipeline";
import { generateVisualInspirationPrompt } from "./visualInspirationPrompt";
import type { AreaEstimate, ZoneAreaEstimate } from "./planMetadata";
import { enclosureOfZone } from "./spaceClassification";
import type { ScoredPlanVariant } from "./planScorer";
import { assertRankingInvariants } from "./planScorer";
import type {
  FloorPlanDebug,
  PresentFloorPlanPipelineOptions,
  PresentedFloorPlanResult,
  PublicArchitectBrief,
  PublicAreaEstimate,
  PublicConfidence,
  PublicDoor,
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
  PublicFurniture,
  PublicPlanGeometry,
  PublicProfessionalReview,
  PublicVisualInspiration,
  PublicWindow,
  PublicZone,
} from "./publicFloorPlanTypes";
import { detectPromptLanguage } from "./prioritySelection";
import type { EnrichedPlanRecommendation } from "./recommendationEngine";

const DISCLAIMER_ES =
  "Esta es una propuesta de layout conceptual, no un plano de obra listo para construir. Un arquitecto matriculado debe validar orientación, dimensiones, normativa municipal, estructura, instalaciones, ventilación y factibilidad constructiva.";

const DISCLAIMER_EN =
  "This is a conceptual layout proposal, not a construction-ready architectural plan. A licensed architect should validate orientation, dimensions, municipal code, structure, installations, ventilation, and buildability.";

const DEFAULT_PROFESSIONAL_REVIEW_ES = [
  "Orientación solar y asoleamiento",
  "Medidas reales del lote y retiros",
  "Normativa municipal",
  "Estructura y losas",
  "Instalaciones (plomería, gas, electricidad)",
  "Ventilación natural",
  "Superficie cubierta vs exterior y semi-cubierto",
];

const FORBIDDEN_PUBLIC_SUBSTRINGS = [
  "penalties",
  "mutationintentscore",
  "adjacencyscore",
  "invalidadjacency",
  "hardadjacency",
  "doorcontactchecks",
  "scoringdetails",
  "mutationtype",
  "raw scorer",
  "validation object",
];

function shouldAttachDebug(options: PresentFloorPlanPipelineOptions): boolean {
  if (options.includeDebug === false) return false;
  if (options.includeDebug === true) return true;
  if (options.isAdmin === true) return true;
  if (options.isDev === true) return true;
  if (process.env.NEXT_PUBLIC_FLOOR_PLAN_DEBUG === "true") return true;
  if (process.env.NEXT_PUBLIC_PIPELINE_DEBUG === "true") return true;
  if (process.env.NODE_ENV === "development") return true;
  return false;
}

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function zoneAreaKind(zone: RenderZone): PublicZone["areaKind"] {
  const enc = enclosureOfZone(zone);
  if (enc === "outdoor") return "outdoor";
  if (enc === "semi_covered") return "semi_covered";
  return "covered";
}

function lookupZoneM2(
  zone: RenderZone,
  estimates?: ZoneAreaEstimate[],
): number | undefined {
  const match = estimates?.find((e) => norm(e.roomId) === norm(zone.sourceRoomId));
  return match?.estimatedAreaM2;
}

function mapPublicZone(
  zone: RenderZone,
  estimates?: ZoneAreaEstimate[],
): PublicZone {
  return {
    id: zone.id,
    label: zone.label,
    type: zone.type,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    estimatedAreaM2: lookupZoneM2(zone, estimates),
    areaKind: zoneAreaKind(zone),
  };
}

function mapAreaEstimate(est?: AreaEstimate): PublicAreaEstimate | undefined {
  if (!est) return undefined;
  return {
    coveredM2: est.estimatedCoveredAreaM2,
    outdoorM2: est.estimatedOutdoorAreaM2,
    semiCoveredM2: est.estimatedSemiCoveredAreaM2,
    totalM2: est.estimatedTotalProgramAreaM2,
    confidence: est.confidence,
  };
}

function mapPublicPlan(plan: GeneratedPlan): PublicPlanGeometry {
  const estimates = plan.metadata.areaEstimate?.zoneAreaEstimates;
  return {
    id: plan.id,
    title: plan.title,
    templateId: plan.templateId,
    variantLabel: plan.variantLabel,
    zones: (plan.zones ?? []).map((z) => mapPublicZone(z, estimates)),
    doors: (plan.doors ?? []).map(
      (d): PublicDoor => ({
        id: d.id,
        from: d.from,
        to: d.to,
        type: d.type,
        wall: d.wall,
        position: d.position,
        width: d.width,
      }),
    ),
    windows: (plan.windows ?? []).map(
      (w): PublicWindow => ({
        id: w.id,
        zoneId: w.zoneId,
        wall: w.wall,
        position: w.position,
        width: w.width,
        size: w.size,
        reason: w.reason,
      }),
    ),
    furniture: (plan.furniture ?? []).map(
      (f): PublicFurniture => ({
        id: f.id,
        zoneId: f.zoneId,
        type: f.type,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
      }),
    ),
    areaEstimate: mapAreaEstimate(plan.metadata.areaEstimate),
  };
}

function sanitizePublicCopy(text: string): string {
  let t = text.trim();
  if (!t) return t;
  t = t.replace(/\bmutationType\b/gi, "variante");
  t = t.replace(/\bpenalty\b/gi, "ajuste");
  t = t.replace(/\bpenalties\b/gi, "ajustes");
  t = t.replace(/\bhard adjacency\b/gi, "conexión entre ambientes");
  t = t.replace(/\braw scorer\b/gi, "evaluación interna");
  t = t.replace(/\bvalidation object\b/gi, "revisión técnica");
  return t;
}

function isSafePublicPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return !FORBIDDEN_PUBLIC_SUBSTRINGS.some((f) => lower.includes(f));
}

function uniqueSafeLines(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const s = sanitizePublicCopy(line);
    if (!s || !isSafePublicPhrase(s) || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) return out;
  }
  return out;
}

function variantHighlights(variant: ScoredPlanVariant): string[] {
  const fromScore = variant.score?.reasons ?? [];
  const fromDesc = variant.description ? [variant.description] : [];
  return uniqueSafeLines([...fromScore, ...fromDesc], 4);
}

function mapPublicVariant(variant: ScoredPlanVariant): PublicFloorPlanVariant {
  return {
    id: variant.mutationType,
    label: variant.label,
    description: variant.description,
    rank: variant.rank,
    score: variant.score?.total,
    plan: mapPublicPlan(variant.plan),
    highlights: variantHighlights(variant),
  };
}

function resolveRecommendedVariant(
  internal: PipelineInternalResult,
): ScoredPlanVariant | null {
  if (internal.recommendedVariant) return internal.recommendedVariant;

  const recStage = internal.stages.find((s) => s.id === "recommendation_engine");
  const recOut = recStage?.output as {
    recommendedVariant?: { mutationType?: string };
  } | undefined;
  if (recOut?.recommendedVariant?.mutationType) {
    const found = internal.scoredVariants.find(
      (v) => v.mutationType === recOut.recommendedVariant!.mutationType,
    );
    if (found) return found;
  }

  const scorerStage = internal.stages.find((s) => s.id === "plan_scorer");
  const scorerOut = scorerStage?.output as {
    recommendedVariant?: { mutationType?: string };
  } | undefined;
  if (scorerOut?.recommendedVariant?.mutationType) {
    const found = internal.scoredVariants.find(
      (v) => v.mutationType === scorerOut.recommendedVariant!.mutationType,
    );
    if (found) return found;
  }

  return internal.topVariants[0] ?? internal.scoredVariants[0] ?? null;
}

function asScoredVariant(
  variant: MutatedPlanResult & { score?: ScoredPlanVariant["score"]; rank?: number },
): ScoredPlanVariant | null {
  if (variant.status !== "ok" || !variant.eligibleForRanking) return null;
  if (!variant.score || !Number.isFinite(variant.score.total)) return null;
  return variant as ScoredPlanVariant;
}

function resolveTopEligibleVariants(
  internal: PipelineInternalResult,
  topN: number,
): ScoredPlanVariant[] {
  const fromRanking = internal.topVariants.filter(
    (v) => v.status === "ok" && v.eligibleForRanking,
  );
  if (fromRanking.length >= topN) return fromRanking.slice(0, topN);

  const fromScored = internal.scoredVariants
    .filter((v) => v.status === "ok" && v.eligibleForRanking)
    .slice(0, topN);
  if (fromScored.length >= topN) return fromScored;

  const fromVariants = internal.variants
    .map((v) => asScoredVariant(v))
    .filter((v): v is ScoredPlanVariant => v != null)
    .slice(0, topN);
  return fromVariants;
}

function buildWhyRecommended(
  recommendation: EnrichedPlanRecommendation | null,
  recommended: ScoredPlanVariant,
  lang: "es" | "en",
): string[] {
  const lines: string[] = [];
  if (recommendation?.narrativeSummary) {
    lines.push(recommendation.narrativeSummary);
  }
  if (recommendation?.why?.length) {
    lines.push(...recommendation.why);
  }
  lines.push(...(recommended.score?.reasons ?? []));
  const safe = uniqueSafeLines(lines, 6);
  if (safe.length > 0) return safe;
  return lang === "es"
    ? [
        "Equilibra el programa interior con una conexión clara entre espacios sociales y el exterior.",
      ]
    : ["Balances the interior program with clear social and outdoor connections."];
}

function buildConfidence(
  recommendation: EnrichedPlanRecommendation | null,
  internal: PipelineInternalResult,
  lang: "es" | "en",
): PublicConfidence {
  if (recommendation?.confidence) {
    return {
      level: recommendation.confidence.overall,
      reasons: uniqueSafeLines(recommendation.confidence.reasons, 6),
    };
  }

  const reasons =
    lang === "es"
      ? [
          "La orientación del lote todavía no está confirmada.",
          "Las medidas reales del terreno deben validarse.",
          "La propuesta es conceptual y requiere revisión profesional.",
        ]
      : [
          "Lot orientation is not confirmed yet.",
          "Real site dimensions must be validated.",
          "This is a conceptual proposal requiring professional review.",
        ];

  if (internal.program.site.orientation === "unknown") {
    return { level: "medium_low", reasons };
  }
  return { level: "medium", reasons: reasons.slice(0, 3) };
}

function buildProfessionalReview(
  recommendation: EnrichedPlanRecommendation | null,
): PublicProfessionalReview {
  const items = recommendation?.professionalReview?.mustReview?.length
    ? uniqueSafeLines(recommendation.professionalReview.mustReview, 10)
    : DEFAULT_PROFESSIONAL_REVIEW_ES;
  return {
    required: recommendation?.professionalReview?.required ?? true,
    items,
  };
}

function humanWarnings(internal: PipelineInternalResult, lang: "es" | "en"): string[] {
  const raw = [
    ...internal.validation.warnings,
    ...internal.generatedPlanValidation.warnings,
    ...internal.topologyValidation.warnings,
    ...(internal.generatedPlan?.metadata.warnings ?? []),
  ];
  const mapped = raw.map((w) => sanitizePublicCopy(w)).filter(isSafePublicPhrase);
  if (mapped.length > 0) return uniqueSafeLines(mapped, 6);
  if (internal.program.site.orientation === "unknown") {
    return lang === "es"
      ? ["La orientación solar del lote aún no está definida."]
      : ["Solar orientation of the lot is not defined yet."];
  }
  return [];
}

function buildArchitectBrief(
  internal: PipelineInternalResult,
  recommended: ScoredPlanVariant,
  lang: "es" | "en",
): PublicArchitectBrief {
  const est = recommended.plan.metadata.areaEstimate;
  const strategyLine =
    internal.strategy.reasons[0] ??
    (lang === "es"
      ? `Parti ${internal.strategy.preferredParti}`
      : `Parti ${internal.strategy.preferredParti}`);

  const keyDecisions = uniqueSafeLines(
    [
      strategyLine,
      ...internal.strategy.reasons.slice(1, 4),
      ...recommended.score.reasons.slice(0, 2),
    ],
    6,
  );

  const estimates = est?.zoneAreaEstimates;
  const rooms: PublicArchitectBrief["rooms"] = recommended.plan.zones.map(
    (z) => ({
      id: z.sourceRoomId,
      label: z.label,
      type: z.type,
      estimatedAreaM2: lookupZoneM2(z, estimates),
      areaKind: zoneAreaKind(z),
    }),
  );

  const nextSteps: string[] = [];
  if (internal.recommendation?.recommendedNextStep) {
    nextSteps.push(sanitizePublicCopy(internal.recommendation.recommendedNextStep.reason));
  }
  if (internal.program.architectQuestions.length > 0) {
    nextSteps.push(
      ...internal.program.architectQuestions
        .slice(0, 3)
        .map(sanitizePublicCopy)
        .filter(isSafePublicPhrase),
    );
  }
  if (nextSteps.length === 0) {
    nextSteps.push(
      lang === "es"
        ? "Confirmar orientación del lote y medidas reales antes de desarrollar el anteproyecto."
        : "Confirm lot orientation and real dimensions before design development.",
    );
  }

  const summary =
    lang === "es"
      ? `${internal.program.title}. Concepto recomendado: ${recommended.label}. ${strategyLine}`
      : `${internal.program.title}. Recommended concept: ${recommended.label}. ${strategyLine}`;

  return {
    summary: sanitizePublicCopy(summary),
    keyDecisions,
    areas: {
      coveredM2: est?.estimatedCoveredAreaM2,
      outdoorM2: est?.estimatedOutdoorAreaM2,
      semiCoveredM2: est?.estimatedSemiCoveredAreaM2,
      totalM2: est?.estimatedTotalProgramAreaM2,
    },
    rooms,
    warnings: humanWarnings(internal, lang),
    nextSteps: uniqueSafeLines(nextSteps, 5),
  };
}

function mapVisualInspiration(
  internal: PipelineInternalResult,
  recommended: ScoredPlanVariant,
): PublicVisualInspiration | undefined {
  const raw = generateVisualInspirationPrompt({
    program: internal.program,
    strategy: internal.strategy,
    recommended,
    userPrompt: internal.userPrompt,
  });
  if (!raw.prompt?.trim()) return undefined;
  const moodNotes = buildPublicInspirationNotes(raw, recommended);
  const notes = uniqueSafeLines([raw.safetyNote, ...moodNotes], 5);
  return { prompt: sanitizePublicCopy(raw.prompt), notes };
}

function buildPublicInspirationNotes(
  raw: ReturnType<typeof generateVisualInspirationPrompt>,
  recommended: ScoredPlanVariant,
): string[] {
  const notes: string[] = [
    "Materialidad sugerida para conversar: madera, hormigón suave y grandes aberturas.",
    `Concepto alineado con: ${recommended.label}.`,
  ];
  if (raw.styleTags?.some((t) => /patio|outdoor/i.test(t))) {
    notes.push("Énfasis en conexión interior–exterior y patio social.");
  }
  if (raw.styleTags?.some((t) => /gallery|semi/i.test(t))) {
    notes.push("Galería o transición semi-cubierta entre estar y exterior.");
  }
  return notes;
}

function buildDebugPayload(
  internal: PipelineInternalResult,
  requestId: string,
): FloorPlanDebug {
  const scorerStage = internal.stages.find((s) => s.id === "plan_scorer");
  const ignoredVariants =
    (scorerStage?.output as { ignoredVariants?: unknown[] })?.ignoredVariants ??
    [];

  const plansById: Record<string, GeneratedPlan> = {};
  if (internal.generatedPlan) plansById[internal.generatedPlan.id] = internal.generatedPlan;
  for (const v of internal.variants) plansById[v.plan.id] = v.plan;

  return {
    requestId,
    stages: internal.stages,
    rawVariants: internal.variants,
    scoredVariants: internal.scoredVariants,
    validation: {
      pipeline: internal.validation,
      generatedPlan: internal.generatedPlanValidation,
      topology: internal.topologyValidation,
      details: internal.scoredVariants.map((v) => ({
        variantId: v.mutationType,
        validation: v.validation,
      })),
    },
    selectionMethod: internal.recommendation?.selectionMethod ?? null,
    timings: internal.stages
      .filter((s) => s.durationMs != null)
      .map((s) => ({
        stageId: s.id,
        label: s.label,
        durationMs: s.durationMs,
      })),
    architecturalIssues: internal.scoredVariants.flatMap(
      (v) => v.validation.architecturalIssues,
    ),
    warnings: [
      ...internal.validation.warnings,
      ...internal.generatedPlanValidation.warnings,
      ...internal.topologyValidation.warnings,
    ],
    plansById,
    recommendationRaw: internal.recommendation
      ? {
          bestVariantId: internal.recommendation.bestVariantId,
          status: internal.recommendation.recommendationStatus,
          selectionMethod: internal.recommendation.selectionMethod,
        }
      : null,
    rawOutput: {
      userPrompt: internal.userPrompt,
      program: internal.program,
      strategy: internal.strategy,
      ignoredVariants,
    },
  };
}

/** Maps raw pipeline output to a curated public product payload (+ optional debug). */
export function presentFloorPlanPipeline(
  internal: PipelineInternalResult,
  options: PresentFloorPlanPipelineOptions,
): PresentedFloorPlanResult {
  const topN = options.topN ?? 3;
  const lang = detectPromptLanguage(internal.userPrompt);

  if (internal.scoredVariants.length > 0) {
    assertRankingInvariants(
      internal.scoredVariants,
      internal.topVariants,
      internal.recommendedVariant,
      topN,
    );
  }

  let recommendedRaw = resolveRecommendedVariant(internal);
  const topRaw = resolveTopEligibleVariants(internal, topN);

  if (!recommendedRaw) {
    recommendedRaw =
      topRaw[0] ??
      internal.scoredVariants[0] ??
      (internal.variants.find((v) => v.status === "ok" && v.eligibleForRanking) as
        | ScoredPlanVariant
        | undefined) ??
      null;
  }

  if (!recommendedRaw) {
    throw new Error(
      "presentFloorPlanPipeline: no eligible recommended variant to publish",
    );
  }

  const topVariants = topRaw.map(mapPublicVariant);
  const recommendedMapped = mapPublicVariant(recommendedRaw);
  const recommended =
    topVariants[0]?.id === recommendedMapped.id
      ? topVariants[0]!
      : topVariants[0] ?? recommendedMapped;

  if (
    topVariants[0] &&
    topVariants[0].id !== recommendedMapped.id &&
    process.env.NODE_ENV !== "production"
  ) {
    console.warn(
      "[FloorPlanResultPresenter] Rank #1 differs from engine recommended variant; publishing rank #1 as recommended.",
      {
        rank1: topVariants[0].id,
        engineRecommended: recommendedMapped.id,
      },
    );
  }

  const publicResult: PublicFloorPlanResult = {
    title: internal.program.title,
    recommendedVariant: recommended,
    topVariants,
    whyRecommended: buildWhyRecommended(
      internal.recommendation,
      recommendedRaw,
      lang,
    ),
    confidence: buildConfidence(internal.recommendation, internal, lang),
    professionalReview: buildProfessionalReview(internal.recommendation),
    architectBrief: buildArchitectBrief(internal, recommendedRaw, lang),
    visualInspiration: mapVisualInspiration(internal, recommendedRaw),
    disclaimer: lang === "es" ? DISCLAIMER_ES : DISCLAIMER_EN,
  };

  const result: PresentedFloorPlanResult = { publicResult };

  if (shouldAttachDebug(options)) {
    result.debug = buildDebugPayload(internal, options.requestId);
  }

  return result;
}

/** @alias presentFloorPlanPipeline */
export const FloorPlanResultPresenter = {
  present: presentFloorPlanPipeline,
};

/** Ensures serialized public JSON does not leak scorer internals. */
export function assertPublicResultSanitized(publicResult: PublicFloorPlanResult): void {
  const json = JSON.stringify(publicResult).toLowerCase();
  for (const forbidden of FORBIDDEN_PUBLIC_SUBSTRINGS) {
    if (json.includes(forbidden)) {
      throw new Error(
        `publicResult leak: forbidden substring "${forbidden}" in serialized output`,
      );
    }
  }
}
