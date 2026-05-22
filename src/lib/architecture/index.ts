export {
  ARCHITECTURAL_PROGRAM_DISCLAIMER,
  type Adjacency,
  type ArchitecturalProgram,
  type DesiredPlanShape,
  type LlmProgramExtractorResult,
  type ProgramRoom,
  type RoomType,
  type SiteInfo,
} from "./architecturalProgram";
export {
  adaptArchitectureProgramToRenderer,
  adaptGeneratedPlanToRenderer,
  PIPELINE_CANVAS_HEIGHT,
  PIPELINE_CANVAS_SCALE,
  PIPELINE_CANVAS_WIDTH,
} from "./adaptGeneratedPlanToRenderer";
export {
  type FurnitureHint,
  type FurnitureHintType,
  type GeneratedPlan,
  type GeneratedPlanValidation,
  type RenderDoor,
  type RenderWindow,
  type RenderZone,
  type RoomSlotMapping,
} from "./generatedPlan";
export {
  validateDoorContacts,
  validateGeneratedPlan,
  validateHardAdjacencyGeometry,
} from "./generatedPlanValidator";
export {
  analyzeZoneAdjacency,
  hasRealSharedWall,
  MIN_SHARED_WALL_LENGTH,
  rectsOverlap,
} from "./zoneGeometry";
export { extractArchitecturalProgram } from "./programExtractor";
export { buildArchitecturalProgramPrompt } from "./programPrompt";
export { generatePlanFromParti, mapRoomsToSlots } from "./partiGenerator";
export {
  getPartiTemplate,
  L_SHAPE_PATIO_TEMPLATE,
  selectPartiTemplate,
  type PartiSlot,
  type PartiTemplate,
  type PartiTemplateId,
} from "./partiTemplates";
export {
  selectArchitecturalStrategy,
  type ArchitecturalStrategy,
  type PartiType,
} from "./strategySelector";
export type {
  DesiredConnection,
  TopologyCluster,
  TopologyClusterType,
  TopologyEdge,
  TopologyGraph,
  TopologyGraphValidation,
  TopologyNode,
} from "./topologyGraph";
export {
  assignClusterId,
  buildTopologyGraph,
  inferDesiredConnection,
  isAccess,
  isCirculation,
  isOutdoor,
  isPrivate,
  isService,
  isSocial,
  validateTopologyGraph,
  weightForEdge,
} from "./topologyGraphBuilder";
export {
  runArchitecturalPipeline,
  runArchitecturalPipelineInternal,
  type PipelineResult,
  type PipelineStage,
  type PipelineValidation,
  type RunArchitecturalPipelineOptions,
  type PipelineInternalResult,
} from "./generationPipeline";
export {
  runFloorPlanPipeline,
  type FloorPlanPipelineResult,
  type RunFloorPlanPipelineOptions,
  type PublicFloorPlanResult,
  type FloorPlanDebugPayload,
  type ArchitectBrief,
  type SvgPlanRender,
  type VisualInspirationPrompt,
} from "./floorPlanPipeline";
export {
  renderPlanToSvg,
  renderVariantsToSvg,
  type NormalizedPlanInput,
  type RenderPlanSvgParams,
} from "./svgRenderer";
export {
  renderFinalPlanToSvg,
  buildPlanViewModel,
  renderArchitecturalPlanSvg,
  FINAL_PLAN_DISCLAIMER,
  type FinalPlanRenderInput,
} from "./finalPlanRenderer";
export type {
  ArchitecturalPlanViewModel,
  BuildViewModelInput,
} from "./final-plan";
export { generateArchitectBrief } from "./architectBriefGenerator";
export { generateVisualInspirationPrompt } from "./visualInspirationPrompt";
export { toFloorPlanPipelineResult } from "./pipelinePublicOutput";
export {
  presentFloorPlanPipeline,
  FloorPlanResultPresenter,
  assertPublicResultSanitized,
} from "./floorPlanResultPresenter";
export type {
  PresentedFloorPlanResult,
  PresentFloorPlanPipelineOptions,
} from "./publicFloorPlanTypes";
export type {
  PipelineRunStatus,
  ProgramExtractionResult,
  PublicVariantSummary,
} from "./floorPlanPipelineTypes";
export {
  buildNormalizedPipelineResponse,
  type CompactPipelineResponse,
  type CompactRecommendation,
  type CompactVariantRef,
  type NormalizedPipelineResult,
  type PipelineDebugPayload,
  type RankingEntry,
} from "./pipelineResponse";
export {
  NEAR_TIE_THRESHOLD,
  selectFinalRecommendation,
  buildSelectionMethod,
  detectPromptLanguage,
  isProgramFixMutation,
  PROGRAM_FIX_MUTATIONS,
  type SelectionMethod,
} from "./prioritySelection";
export {
  evaluateZoneDimensions,
  collectDimensionalRulesApplied,
  type DimensionalRuleApplied,
} from "./dimensionalRules";
export {
  PLAN_MUTATIONS,
  DEFAULT_MUTATION_TYPES,
  applyMutationPipeline,
  statusFromValidation,
  type MutationEffect,
  type MutationStatus,
  type MutationType,
  type MutatedPlanResult,
  type PlanMutation,
} from "./mutations";
export { computeMutationEffect, dedupeStrings } from "./mutationEffect";
export {
  generatePlanVariants,
  mutationStageMessages,
  summarizeVariants,
  type GeneratePlanVariantsParams,
} from "./variantGenerator";
export {
  buildFinalRankedVariants,
  compareScoredVariants,
  isRankEligibleScoredVariant,
  isVariantScorable,
  scorePlanVariant,
  scorePlanVariants,
  type IgnoredVariantSummary,
  type PlanRecommendation,
  type RecommendationStatus,
  type RecommendedNextStep,
  type PlanScoreBreakdown,
  type PlanScorePenalties,
  type PlanScorerResult,
  type ScoredPlanVariant,
  type ScorePlanVariantsParams,
} from "./planScorer";
export {
  buildNarrativeSummary,
  priorityTieBoost,
  runRecommendationEngine,
  type EnrichedPlanRecommendation,
  type RecommendationConfidence,
  type ProfessionalReview,
  type RecommendationEngineResult,
} from "./recommendationEngine";
export { briefPriorityScore } from "./prioritySelection";
export {
  buildAreaEstimate,
  buildCoordinateSystem,
  buildPlanSpatialMetadata,
  enrichPlanSpatialMetadata,
  type AreaEstimate,
  type ZoneAreaEstimate,
  type CoordinateSystem,
  type PlanSpatialMetadata,
  hasLaundryZone,
} from "./planMetadata";
export {
  validateArchitecturalDesign,
  issuesToValidationStrings,
} from "./architecturalValidation";
export type {
  ArchitecturalValidationIssue,
  ArchitecturalValidationSeverity,
} from "./generatedPlan";
export {
  isCoveredSpace,
  isOutdoorSpace,
  isSemiOutdoorSpace,
  enclosureOfZone,
} from "./spaceClassification";
export {
  clonePlan,
  normalizePlanAfterMutation,
  regenerateDoorsFromTopology,
  mirrorPlanHorizontal,
} from "./planNormalize";
