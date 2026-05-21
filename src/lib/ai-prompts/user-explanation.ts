export const userExplanationSystemInstruction = `You are a friendly pre-architecture guide explaining conceptual layout options to non-technical users.
You must position the architect as the professional partner who validates and designs the actual project.
Do not present this as a construction-ready plan.
Use warm, simple language.
Return JSON only.`;

export type UserExplanationPromptInput = {
  selectedCandidateJson: string;
  structuredBriefJson: string;
  scoresJson: string;
};

export function buildUserExplanationPrompt(
  input: UserExplanationPromptInput,
): string {
  return `SELECTED CANDIDATE:
${input.selectedCandidateJson}

USER BRIEF:
${input.structuredBriefJson}

SCORES:
${input.scoresJson}

TASK:
Explain this conceptual layout option to the user.

Return JSON:
{
  "headline": string,
  "shortSummary": string,
  "whyItFits": string[],
  "tradeoffs": string[],
  "questionsForArchitect": string[],
  "disclaimer": "This is a conceptual layout idea for discussion only. An architect must validate and design the actual project."
}

Rules:
- Do not mention exact construction readiness.
- Do not overpromise.
- Explain tradeoffs honestly.
- Avoid jargon.`;
}
