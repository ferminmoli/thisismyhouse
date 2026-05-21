import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";

/** Resumen compacto por candidato para Prompt 4 (sin geometría cruda). */
export function buildCandidateSummaries(variations: LayoutVariation[]) {
  return variations.map((v) => ({
    candidateId: v.optionId,
    label: v.label,
    strategyId: v.strategyId,
    strategyDescription: v.description,
    templateId: v.layout.templateMeta?.templateId,
    templateLabel: v.layout.templateMeta?.templateLabel,
    variantId: v.variantId,
    fillRatio: Math.round(v.layout.fillRatio * 100) / 100,
    zoneCount: v.layout.zones.length,
    warnings: v.layout.warnings.slice(0, 5),
    localQualityScores: {
      composite: Math.round(v.scores.compositeScore * 100),
      circulation: Math.round(v.scores.circulationScore * 100),
      patio: Math.round(v.scores.patioConnectionScore * 100),
      zoning: Math.round(v.scores.zoningScore * 100),
      composition: Math.round(v.scores.compositionScore * 100),
    },
  }));
}
