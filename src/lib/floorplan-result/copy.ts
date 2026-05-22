import type {
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
} from "@/lib/architecture/floorPlanPipelineTypes";

const PROFESSIONAL_WARNING_ES =
  "Resultado conceptual. No reemplaza el trabajo de un arquitecto ni valida normativa, estructura, instalaciones u orientación solar.";

export function professionalReviewWarning(): string {
  return PROFESSIONAL_WARNING_ES;
}

export function conceptualPageTitle(isShowingRecommended: boolean): string {
  return isShowingRecommended
    ? "Planta conceptual recomendada"
    : "Planta conceptual";
}

/** Plan-first public result page title. */
export function recommendedPlanPageTitle(isShowingRecommended: boolean): string {
  return isShowingRecommended ? "Plano recomendado" : "Plano seleccionado";
}

export function conceptualReviewBadge(): string {
  return "Conceptual · requiere revisión profesional";
}

export function whySectionTitle(isShowingRecommended: boolean): string {
  return isShowingRecommended ? "Por qué este plano" : "Por qué esta variante";
}

export function buildWhyNarrative(
  publicResult: PublicFloorPlanResult,
  selected: PublicFloorPlanVariant,
  isShowingRecommended: boolean,
): { narrative: string; bullets: string[] } {
  if (isShowingRecommended) {
    const bullets = publicResult.whyRecommended.filter(Boolean);
    const narrative =
      bullets.find((b) => b.length >= 60) ??
      publicResult.architectBrief.summary ??
      bullets[0] ??
      defaultRecommendedNarrative(publicResult);
    const rest = bullets.filter((b) => b !== narrative).slice(0, 5);
    return { narrative, bullets: rest.length ? rest : bullets.slice(0, 4) };
  }

  return buildAlternateWhyNarrative(publicResult, selected);
}

function defaultRecommendedNarrative(publicResult: PublicFloorPlanResult): string {
  return (
    `Esta propuesta responde al programa de ${publicResult.title} con una distribución clara entre áreas sociales, privadas y exterior. ` +
    "Es un punto de partida conceptual para conversar con un arquitecto sobre medidas reales, orientación y normativa."
  );
}

function buildAlternateWhyNarrative(
  publicResult: PublicFloorPlanResult,
  selected: PublicFloorPlanVariant,
): { narrative: string; bullets: string[] } {
  const recLabel = publicResult.recommendedVariant.label;
  const narrative =
    selected.description?.trim() ||
    `Esta variante (${selected.label}) explora un matiz distinto respecto de la recomendada (${recLabel}). ` +
      "Te permite comparar cómo cambia la relación entre cocina, estar-comedor, patio y dormitorios antes de validar el proyecto con un profesional.";

  const bullets = selected.highlights
    .filter((h) => h !== narrative && h.length >= 8)
    .slice(0, 4);

  if (bullets.length === 0) {
    bullets.push(
      "Mantiene el mismo programa base con otro énfasis espacial.",
      `Comparala con la opción recomendada: ${recLabel}.`,
    );
  }

  return { narrative, bullets };
}

export function collectHighlightCards(
  selected: PublicFloorPlanVariant,
  publicResult: PublicFloorPlanResult,
  isShowingRecommended: boolean,
  max = 5,
): string[] {
  const fromVariant = selected.highlights ?? [];
  const fromWhy = isShowingRecommended ? publicResult.whyRecommended : [];
  const fromBrief = publicResult.architectBrief.keyDecisions ?? [];
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const line of [...fromVariant, ...fromWhy, ...fromBrief]) {
    const t = line.trim();
    if (!t || t.length < 8 || seen.has(t)) continue;
    if (looksLikeInternalCopy(t)) continue;
    seen.add(t);
    merged.push(t);
    if (merged.length >= max) return merged;
  }
  return merged;
}

function looksLikeInternalCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("adjacencyscore") ||
    lower.includes("mutationintent") ||
    lower.includes("penalties") ||
    lower.includes("hardadjacency")
  );
}
