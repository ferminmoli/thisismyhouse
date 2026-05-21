/**
 * Constraint-based procedural floorplanning (Maket-style).
 *
 * @example
 * ```ts
 * const result = runConstraintLayout(constraintInput);
 * const layout = runConstraintLayout(constraintInput);
 * ```
 */
export { ConstraintLayoutEngine, runConstraintLayout } from "./ConstraintLayoutEngine";
export {
  constraintPlanSchema,
  isConstraintPlanRaw,
  parseConstraintPlan,
} from "./schema";
export {
  geminiProgramToConstraint,
  isGeminiProgramRaw,
} from "./adapters/gemini-program-adapter";
export type { GeminiProgramJson } from "./adapters/gemini-program-adapter";
export type {
  ConstraintPlanInput,
  ConstraintZoneSpec,
  ConstraintAdjacency,
  ConstraintLot,
  LayoutEngineResult,
  LayoutEngineOptions,
  PlacedZone,
} from "./types";
