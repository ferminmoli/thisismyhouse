import { z } from "zod";

export const userExplanationSchema = z.object({
  headline: z.string(),
  shortSummary: z.string(),
  whyItFits: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  questionsForArchitect: z.array(z.string()),
  disclaimer: z.string(),
});

export type UserFacingExplanation = z.infer<typeof userExplanationSchema>;
