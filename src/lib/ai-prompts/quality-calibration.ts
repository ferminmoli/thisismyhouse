export const qualityCalibrationSystemInstruction = `You are an expert residential layout evaluator.
You are helping calibrate a conceptual plan generator.
You do not approve construction. You only evaluate conceptual layout quality.
Return JSON only.`;

export type QualityCalibrationPromptInput = {
  candidateJson: string;
  localScoresJson: string;
  validationResultJson: string;
};

export function buildQualityCalibrationPrompt(
  input: QualityCalibrationPromptInput,
): string {
  return `PLAN CANDIDATE:
${input.candidateJson}

LOCAL SCORES:
${input.localScoresJson}

VALIDATION RESULT:
${input.validationResultJson}

TASK:
Evaluate whether the local scoring is too generous, too strict, or reasonable.

Return JSON:
{
  "scoreCalibration": "too_generous" | "reasonable" | "too_strict",
  "suggestedScoreDelta": number,
  "mustReject": boolean,
  "reasons": string[],
  "missingMetrics": string[]
}

Hard rule:
- If validation has overlaps, out-of-bounds zones, or missing required rooms, mustReject must be true.`;
}
