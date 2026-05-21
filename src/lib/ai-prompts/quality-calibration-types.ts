import { z } from "zod";

export const qualityCalibrationOutputSchema = z.object({
  scoreCalibration: z.enum(["too_generous", "reasonable", "too_strict"]),
  suggestedScoreDelta: z.number(),
  mustReject: z.boolean(),
  reasons: z.array(z.string()),
  missingMetrics: z.array(z.string()),
});

export type QualityCalibrationOutput = z.infer<
  typeof qualityCalibrationOutputSchema
>;
