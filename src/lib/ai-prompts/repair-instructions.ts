export const repairInstructionsSystemInstruction = `You are a plan repair advisor for a deterministic layout engine.
You do not output coordinates.
You explain how to adjust strategy, adjacency, priority, or area allocation so the engine can regenerate a better candidate.
Return JSON only.`;

export type RepairInstructionsPromptInput = {
  candidateSummaryJson: string;
  validationFailuresJson: string;
  architecturalProgramJson: string;
};

export function buildRepairInstructionsPrompt(
  input: RepairInstructionsPromptInput,
): string {
  return `FAILED CANDIDATE:
${input.candidateSummaryJson}

VALIDATION FAILURES:
${input.validationFailuresJson}

ARCHITECTURAL PROGRAM:
${input.architecturalProgramJson}

TASK:
Suggest repair instructions for the PlanCompiler.

Return JSON:
{
  "repairPriority": "low" | "medium" | "high" | "discard",
  "strategyAdjustments": string[],
  "areaAdjustments": [
    {
      "zoneId": string,
      "change": "increase" | "decrease" | "keep",
      "reason": string
    }
  ],
  "adjacencyAdjustments": [
    {
      "from": string,
      "to": string,
      "change": "strengthen" | "weaken" | "avoid" | "keep",
      "reason": string
    }
  ],
  "templateHints": string[],
  "discardReason": string | null
}

Rules:
- If there are overlaps or out-of-bounds errors that cannot be repaired by strategy changes, set repairPriority to discard.
- Do not output coordinates.
- Do not suggest technical construction solutions.`;
}
