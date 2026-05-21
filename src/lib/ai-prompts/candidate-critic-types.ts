import { z } from "zod";

export const candidateCriticOutputSchema = z.object({
  candidateReviews: z.array(
    z.object({
      candidateId: z.string(),
      briefFitScore: z.number().min(0).max(100),
      livabilityScore: z.number().min(0).max(100),
      privacyScore: z.number().min(0).max(100),
      socialOutdoorScore: z.number().min(0).max(100),
      mainStrength: z.string(),
      mainRisk: z.string(),
      bestFor: z.string(),
      architectDiscussionQuestions: z.array(z.string()),
    }),
  ),
  recommendedCandidateId: z.string(),
  recommendationReason: z.string(),
});

export type CandidateReview = z.infer<
  typeof candidateCriticOutputSchema
>["candidateReviews"][number];

export type CandidateCriticOutput = z.infer<typeof candidateCriticOutputSchema>;
