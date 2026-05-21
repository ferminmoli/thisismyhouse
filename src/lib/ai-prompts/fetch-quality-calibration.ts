import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import { invokeGeminiJson } from "./invoke-gemini-json";
import { buildQualityCalibrationPayload } from "./build-calibration-payload";
import {
  buildQualityCalibrationPrompt,
  qualityCalibrationSystemInstruction,
} from "./quality-calibration";
import {
  qualityCalibrationOutputSchema,
  type QualityCalibrationOutput,
} from "./quality-calibration-types";

function localQualityCalibration(
  variation: LayoutVariation,
): QualityCalibrationOutput {
  const validation = buildQualityCalibrationPayload(variation);
  const parsed = JSON.parse(validation.validationResultJson) as {
    ok: boolean;
    overlaps: unknown[];
    outOfBounds: unknown[];
    unmappedRooms: string[];
  };

  const mustReject =
    !parsed.ok ||
    parsed.overlaps.length > 0 ||
    parsed.outOfBounds.length > 0 ||
    parsed.unmappedRooms.length > 2;

  const composite = variation.scores.compositeScore;
  let scoreCalibration: QualityCalibrationOutput["scoreCalibration"] =
    "reasonable";
  let suggestedScoreDelta = 0;

  if (mustReject && composite > 0.5) {
    scoreCalibration = "too_generous";
    suggestedScoreDelta = -0.2;
  } else if (!mustReject && composite < 0.45) {
    scoreCalibration = "too_strict";
    suggestedScoreDelta = 0.08;
  }

  const reasons: string[] = [];
  if (parsed.overlaps.length > 0) {
    reasons.push("Hay solapes entre ambientes; el ranking local es demasiado optimista.");
  }
  if (!parsed.ok) {
    reasons.push("La validación geométrica falló.");
  }
  if (reasons.length === 0) {
    reasons.push("Puntuación local alineada con la validación del motor.");
  }

  return {
    scoreCalibration,
    suggestedScoreDelta,
    mustReject,
    reasons,
    missingMetrics: mustReject ? ["hard_validation_passed"] : [],
  };
}

export type FetchQualityCalibrationResult =
  | {
      ok: true;
      calibration: QualityCalibrationOutput;
      source: "gemini" | "local";
      model?: string;
    }
  | { ok: false; error: string; fallback: QualityCalibrationOutput };

/** Prompt 7 — calibración offline / debug (no bloquea runtime UX). */
export async function fetchQualityCalibration(
  variation: LayoutVariation,
): Promise<FetchQualityCalibrationResult> {
  const fallback = localQualityCalibration(variation);
  const payload = buildQualityCalibrationPayload(variation);

  if (isProgramMockEnabled()) {
    return { ok: true, calibration: fallback, source: "local" };
  }

  const prompt = buildQualityCalibrationPrompt({
    candidateJson: payload.candidateJson,
    localScoresJson: payload.localScoresJson,
    validationResultJson: payload.validationResultJson,
  });

  const result = await invokeGeminiJson(
    prompt,
    qualityCalibrationSystemInstruction,
    qualityCalibrationOutputSchema,
    0.25,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  const validation = JSON.parse(payload.validationResultJson) as {
    ok: boolean;
    overlaps: unknown[];
  };
  const forceReject = !validation.ok || validation.overlaps.length > 0;

  return {
    ok: true,
    calibration: {
      ...result.data,
      mustReject: result.data.mustReject || forceReject,
    },
    source: "gemini",
    model: result.model,
  };
}
