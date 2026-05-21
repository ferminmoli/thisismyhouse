/**
 * Prompt Suite — ver arc/plan-generation-prompt-suite.md
 *
 * Runtime activo:
 * - Prompt 1 site-brief → fetchSiteBrief (generate-architectural-program)
 * - Prompt 2 programa → generate-architectural-program
 * - Prompt 3 estrategias → fetchLayoutStrategies (/api/generate-variations)
 * - Prompt 4 crítica → fetchCandidateCritic (generate-variations)
 * - Prompt 5 reparación → fetchRepairInstructions (variaciones fallidas)
 * - Prompt 6 explicación → fetchUserExplanation (/api/user-explanation)
 * - Prompt 7 calibración → fetchQualityCalibration (debug-pipeline / offline)
 */

export {
  architecturalProgramSystemInstruction,
  buildArchitecturalProgramPrompt,
  buildArchitecturalProgramRepairPrompt,
  buildArchitecturalProgramRepairPromptFromOnboarding,
  buildArchitecturalProgramPromptFromOnboarding,
  type ArchitecturalProgramPromptInput,
} from "./architectural-program";

export {
  siteBriefInterpreterSystemInstruction,
  buildSiteBriefInterpreterPrompt,
  interpretSiteBriefLocally,
  buildSiteBriefFromPreferences,
  siteBriefOutputSchema,
  type SiteBriefOutput,
} from "./site-brief-interpreter";

export {
  layoutStrategiesSystemInstruction,
  buildLayoutStrategiesPrompt,
  defaultLayoutStrategies,
  localVariationStrategyFromId,
  templateVariantFromStrategyId,
  layoutStrategiesOutputSchema,
  type LayoutStrategySpec,
} from "./layout-strategies";

export {
  candidateCriticSystemInstruction,
  buildCandidateCriticPrompt,
} from "./candidate-critic";

export {
  candidateCriticOutputSchema,
  type CandidateCriticOutput,
  type CandidateReview,
} from "./candidate-critic-types";

export { buildCandidateSummaries } from "./build-candidate-summaries";
export { fetchCandidateCritic, localCandidateCritic } from "./fetch-candidate-critic";

export {
  repairInstructionsSystemInstruction,
  buildRepairInstructionsPrompt,
} from "./repair-instructions";

export {
  repairInstructionsOutputSchema,
  type RepairInstructionsOutput,
} from "./repair-instructions-types";

export { applyRepairToStrategy } from "./apply-repair-to-strategy";
export {
  fetchRepairInstructions,
  type FailedCandidateContext,
} from "./fetch-repair-instructions";

export {
  userExplanationSystemInstruction,
  buildUserExplanationPrompt,
} from "./user-explanation";

export {
  qualityCalibrationSystemInstruction,
  buildQualityCalibrationPrompt,
} from "./quality-calibration";

export {
  qualityCalibrationOutputSchema,
  type QualityCalibrationOutput,
} from "./quality-calibration-types";

export { buildQualityCalibrationPayload } from "./build-calibration-payload";
export { fetchQualityCalibration } from "./fetch-quality-calibration";

export {
  structuredBriefFromPreferences,
  type StructuredBrief,
} from "./types";
