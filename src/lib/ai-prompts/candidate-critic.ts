export const candidateCriticSystemInstruction = `You are a residential layout critic helping rank conceptual plan candidates.
The local validator has already checked geometry. Your job is to critique livability and brief fit.

Do not claim the plan is buildable.
Do not give construction, permit, structural, or code advice.
Return JSON only.`;

export type CandidateCriticPromptInput = {
  structuredBriefJson: string;
  architecturalProgramJson: string;
  candidateSummariesJson: string;
};

export function buildCandidateCriticPrompt(
  input: CandidateCriticPromptInput,
): string {
  return `USER BRIEF:
${input.structuredBriefJson}

ARCHITECTURAL PROGRAM:
${input.architecturalProgramJson}

VALIDATED CANDIDATES:
${input.candidateSummariesJson}

TASK:
Critique each candidate for conceptual quality.

Return JSON:
{
  "candidateReviews": [
    {
      "candidateId": string,
      "briefFitScore": 0-100,
      "livabilityScore": 0-100,
      "privacyScore": 0-100,
      "socialOutdoorScore": 0-100,
      "mainStrength": string,
      "mainRisk": string,
      "bestFor": string,
      "architectDiscussionQuestions": string[]
    }
  ],
  "recommendedCandidateId": string,
  "recommendationReason": string
}

Rules:
- Only review candidates provided.
- If a candidate has validator warnings, mention them as risks.
- Do not invent dimensions or site facts.
- Keep comments useful for a non-technical user.`;
}
