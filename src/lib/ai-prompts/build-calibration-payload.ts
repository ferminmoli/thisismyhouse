import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import { buildCandidateSummaries } from "./build-candidate-summaries";

export function buildValidationResultJson(variation: LayoutVariation) {
  const v = variation.layout.templateMeta?.validation;
  return {
    ok: v?.ok ?? true,
    overlaps: v?.overlaps ?? [],
    outOfBounds: v?.outOfBounds ?? [],
    missingMappings: v?.missingMappings ?? [],
    invalidDoorRefs: v?.invalidDoorRefs ?? [],
    layoutWarnings: variation.layout.warnings.slice(0, 8),
    unmappedRooms: variation.layout.templateMeta?.unmappedRooms ?? [],
  };
}

export function buildQualityCalibrationPayload(variation: LayoutVariation) {
  const summaries = buildCandidateSummaries([variation]);
  return {
    candidateJson: JSON.stringify(summaries[0] ?? {}, null, 2),
    localScoresJson: JSON.stringify(variation.scores, null, 2),
    validationResultJson: JSON.stringify(
      buildValidationResultJson(variation),
      null,
      2,
    ),
  };
}
