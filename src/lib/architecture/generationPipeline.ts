import type { ArchitecturalProgram } from "./architecturalProgram";
import { extractArchitecturalProgram } from "./programExtractor";
import type { GeneratedPlan, GeneratedPlanValidation } from "./generatedPlan";
import { validateGeneratedPlan } from "./generatedPlanValidator";
import { generatePlanFromParti } from "./partiGenerator";
import { selectPartiTemplate } from "./partiTemplates";
import {
  selectArchitecturalStrategy,
  type ArchitecturalStrategy,
} from "./strategySelector";
import type { TopologyGraph } from "./topologyGraph";
import {
  buildTopologyGraph,
  validateTopologyGraph,
} from "./topologyGraphBuilder";
import type { MutatedPlanResult } from "./mutations";
import {
  generatePlanVariants,
  mutationStageMessages,
  summarizeVariants,
} from "./variantGenerator";
import { enrichPlanSpatialMetadata } from "./planMetadata";
import {
  runRecommendationEngine,
  type EnrichedPlanRecommendation,
} from "./recommendationEngine";
import type { ScoredPlanVariant } from "./planScorer";
import {
  buildNormalizedPipelineResponse,
  type NormalizedPipelineResult,
  type PipelineDebugPayload,
} from "./pipelineResponse";

export type PipelineStageStatus = "ok" | "warn" | "error";

export type PipelineStage = {
  id: string;
  label: string;
  status: PipelineStageStatus;
  durationMs?: number;
  output: Record<string, unknown>;
  messages?: string[];
};

export type PipelineValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type RunArchitecturalPipelineOptions = {
  /** Si true, incluye planes completos duplicados y trazas de etapas en `debug`. */
  debug?: boolean;
};

/** Resultado compacto del pipeline (respuesta por defecto). */
export type PipelineResult = NormalizedPipelineResult;

export type PipelineInternalResult = {
  userPrompt: string;
  program: ArchitecturalProgram;
  topologyGraph: TopologyGraph;
  topologyValidation: PipelineValidation;
  strategy: ArchitecturalStrategy;
  generatedPlan: GeneratedPlan | null;
  generatedPlanValidation: GeneratedPlanValidation;
  variants: MutatedPlanResult[];
  scoredVariants: ScoredPlanVariant[];
  topVariants: ScoredPlanVariant[];
  recommendedVariant: ScoredPlanVariant | null;
  recommendation: EnrichedPlanRecommendation | null;
  validation: PipelineValidation;
  stages: PipelineStage[];
  extractorMeta: {
    mock: boolean;
    model: string;
  };
  debug?: PipelineDebugPayload;
};

function roomIds(program: ArchitecturalProgram): Set<string> {
  return new Set(program.rooms.map((r) => r.id));
}

function validateAdjacencyRefs(
  program: ArchitecturalProgram,
  edges: ArchitecturalProgram["hardAdjacencies"],
  label: string,
  errors: string[],
) {
  const ids = roomIds(program);
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      errors.push(
        `${label}: referencia inválida ${edge.from} → ${edge.to}`,
      );
    }
  }
}

function validateProgramSemantics(
  program: ArchitecturalProgram,
): PipelineValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredMissing = program.rooms.filter(
    (r) => r.required && !r.id,
  );
  if (requiredMissing.length > 0) {
    errors.push("Hay ambientes requeridos sin id.");
  }

  if (program.rooms.length < 3) {
    warnings.push("Programa con menos de 3 ambientes.");
  }

  validateAdjacencyRefs(
    program,
    program.hardAdjacencies,
    "hardAdjacency",
    errors,
  );
  validateAdjacencyRefs(
    program,
    program.softAdjacencies,
    "softAdjacency",
    errors,
  );

  for (const room of program.rooms) {
    const raw = room as Record<string, unknown>;
    if (
      "x" in raw ||
      "y" in raw ||
      "width" in raw ||
      "height" in raw
    ) {
      warnings.push(
        "Program should be semantic only. Geometry fields were ignored.",
      );
      break;
    }
  }

  if (!program.disclaimer.includes("conceptual sketch")) {
    warnings.push("Disclaimer no coincide con el estándar del pipeline.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function toPipelineValidation(v: {
  ok: boolean;
  errors: string[];
  warnings: string[];
}): PipelineValidation {
  return { ok: v.ok, errors: v.errors, warnings: v.warnings };
}

/**
 * Pipeline (paso 5):
 * User Prompt → Program → Topology → Strategy → Parti → Validate → Mutations → Scorer
 */
export async function runArchitecturalPipeline(
  userPrompt: string,
  options?: RunArchitecturalPipelineOptions,
): Promise<PipelineResult> {
  const stages: PipelineStage[] = [];

  stages.push({
    id: "user_prompt_received",
    label: "Brief del usuario",
    status: "ok",
    output: {
      prompt: userPrompt,
      length: userPrompt.length,
    },
  });

  const tExtract = Date.now();
  const extracted = await extractArchitecturalProgram(userPrompt);
  stages.push({
    id: "program_extractor_mock",
    label: "Program Extractor (mock)",
    status: "ok",
    durationMs: Date.now() - tExtract,
    output: {
      mock: extracted.mock,
      model: extracted.model,
      title: extracted.program.title,
      targetAreaM2: extracted.program.targetAreaM2,
      desiredPlanShape: extracted.program.desiredPlanShape,
      roomCount: extracted.program.rooms.length,
      hardAdjacencyCount: extracted.program.hardAdjacencies.length,
      softAdjacencyCount: extracted.program.softAdjacencies.length,
    },
    messages: extracted.warnings,
  });

  const tValidate = Date.now();
  const validation = validateProgramSemantics(extracted.program);
  stages.push({
    id: "program_validate",
    label: "Validación semántica del programa",
    status: validation.ok
      ? validation.warnings.length > 0
        ? "warn"
        : "ok"
      : "error",
    durationMs: Date.now() - tValidate,
    output: {
      ok: validation.ok,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
    messages: [...validation.errors, ...validation.warnings],
  });

  const tTopology = Date.now();
  const topologyGraph = buildTopologyGraph(extracted.program);
  const hardCount = topologyGraph.edges.filter((e) => e.strength === "hard").length;
  const softCount = topologyGraph.edges.filter((e) => e.strength === "soft").length;
  stages.push({
    id: "topology_graph_builder",
    label: "Topological Graph Builder",
    status: topologyGraph.warnings.length > 0 ? "warn" : "ok",
    durationMs: Date.now() - tTopology,
    output: {
      nodeCount: topologyGraph.nodes.length,
      edgeCount: topologyGraph.edges.length,
      hardEdgeCount: hardCount,
      softEdgeCount: softCount,
      clusterCount: topologyGraph.clusters.length,
    },
    messages: topologyGraph.warnings,
  });

  const tTopoValidate = Date.now();
  const topoRaw = validateTopologyGraph(topologyGraph, extracted.program);
  const topologyValidation = toPipelineValidation(topoRaw);
  stages.push({
    id: "topology_graph_validate",
    label: "Validación del grafo topológico",
    status: topologyValidation.ok
      ? topologyValidation.warnings.length > 0
        ? "warn"
        : "ok"
      : "error",
    durationMs: Date.now() - tTopoValidate,
    output: {
      ok: topologyValidation.ok,
      errorCount: topologyValidation.errors.length,
      warningCount: topologyValidation.warnings.length,
    },
    messages: [
      ...topologyValidation.errors,
      ...topologyValidation.warnings,
    ],
  });

  const tStrategy = Date.now();
  const strategy = selectArchitecturalStrategy(
    extracted.program,
    topologyGraph,
  );
  stages.push({
    id: "strategy_selector",
    label: "Strategy Selector",
    status: "ok",
    durationMs: Date.now() - tStrategy,
    output: {
      preferredParti: strategy.preferredParti,
      partiCandidates: strategy.partiCandidates,
      constraints: strategy.constraints,
    },
    messages: strategy.reasons,
  });

  const selectedTemplate = selectPartiTemplate(strategy.preferredParti);
  stages.push({
    id: "parti_template_selected",
    label: "Parti template selected",
    status: selectedTemplate.warning ? "warn" : "ok",
    output: {
      templateId: selectedTemplate.template.id,
      templateName: selectedTemplate.template.name,
      preferredParti: strategy.preferredParti,
    },
    messages: selectedTemplate.warning ? [selectedTemplate.warning] : undefined,
  });

  let generatedPlan: GeneratedPlan | null = null;
  let generatedPlanValidation: GeneratedPlanValidation = {
    ok: true,
    errors: [],
    warnings: [],
    infos: [],
    architecturalIssues: [],
    hardAdjacencyChecks: [],
    doorContactChecks: [],
  };
  let variants: MutatedPlanResult[] = [];
  let scoredVariants: ScoredPlanVariant[] = [];
  let topVariants: ScoredPlanVariant[] = [];
  let recommendedVariant: ScoredPlanVariant | null = null;
  let recommendation: EnrichedPlanRecommendation | null = null;

  const tParti = Date.now();
  try {
    generatedPlan = enrichPlanSpatialMetadata(
      generatePlanFromParti({
        program: extracted.program,
        topologyGraph,
        strategy,
      }),
      extracted.program,
    );
    stages.push({
      id: "parti_generator",
      label: "Parametric Parti Generator",
      status: "ok",
      durationMs: Date.now() - tParti,
      output: {
        planId: generatedPlan.id,
        templateId: generatedPlan.templateId,
        zoneCount: generatedPlan.zones.length,
        doorCount: generatedPlan.doors.length,
        windowCount: generatedPlan.windows.length,
        furnitureCount: generatedPlan.furniture.length,
      },
      messages: generatedPlan.metadata.notes,
    });
  } catch (err) {
    stages.push({
      id: "parti_generator",
      label: "Parametric Parti Generator",
      status: "error",
      durationMs: Date.now() - tParti,
      output: {
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }

  if (generatedPlan) {
    const tPlanVal = Date.now();
    const planVal = validateGeneratedPlan(generatedPlan, {
      strategy,
      program: extracted.program,
      topologyGraph,
      hardAdjacencies: extracted.program.hardAdjacencies,
    });
    generatedPlanValidation = planVal;
    stages.push({
      id: "generated_plan_validate",
      label: "Generated plan validation",
      status: generatedPlanValidation.ok
        ? generatedPlanValidation.warnings.length > 0
          ? "warn"
          : "ok"
        : "error",
      durationMs: Date.now() - tPlanVal,
      output: {
        ok: generatedPlanValidation.ok,
        errorCount: generatedPlanValidation.errors.length,
        warningCount: generatedPlanValidation.warnings.length,
      },
      messages: [
        ...generatedPlanValidation.errors,
        ...generatedPlanValidation.warnings,
      ],
    });

    const tMutations = Date.now();
    variants = generatePlanVariants({
      basePlan: generatedPlan,
      topologyGraph,
      program: extracted.program,
    }).map((v) => ({
      ...v,
      plan: enrichPlanSpatialMetadata(v.plan, extracted.program),
    }));
    const summary = summarizeVariants(variants);
    const mutationStageStatus: PipelineStageStatus =
      summary.errorCount > 0
        ? "warn"
        : summary.warnCount > 0
          ? "warn"
          : "ok";
    stages.push({
      id: "mutation_engine",
      label: "Mutation Engine",
      status: mutationStageStatus,
      durationMs: Date.now() - tMutations,
      output: summary,
      messages: mutationStageMessages(variants),
    });

    const tScorer = Date.now();
    const scorerResult = runRecommendationEngine({
      program: extracted.program,
      topologyGraph,
      referencePlan: generatedPlan,
      variants,
      userPrompt,
    });
    scoredVariants = scorerResult.scoredVariants;
    topVariants = scorerResult.topVariants;
    recommendedVariant = scorerResult.recommendedVariant;
    recommendation = scorerResult.recommendation;

    stages.push({
      id: "plan_scorer",
      label: "Plan Scorer",
      status: scorerResult.recommendedVariant ? "ok" : "warn",
      durationMs: Date.now() - tScorer,
      output: scorerResult.stageOutput,
    });

    stages.push({
      id: "recommendation_engine",
      label: "Recommendation Engine",
      status: recommendation ? "ok" : "warn",
      durationMs: 0,
      output: {
        recommendedVariant: recommendation
          ? {
              mutationType: recommendation.bestVariantId,
              label: recommendation.bestVariantLabel,
              totalScore: recommendedVariant?.score.total,
            }
          : null,
        confidence: recommendation?.confidence ?? null,
        professionalReview: recommendation?.professionalReview ?? null,
        selectionMethod: recommendation?.selectionMethod ?? null,
        narrativeSummary: recommendation?.narrativeSummary ?? null,
      },
    });
  }

  const internal: PipelineInternalResult = {
    userPrompt,
    program: extracted.program,
    topologyGraph,
    topologyValidation,
    strategy,
    generatedPlan,
    generatedPlanValidation,
    variants,
    scoredVariants,
    topVariants,
    recommendedVariant,
    recommendation,
    validation,
    stages,
    extractorMeta: {
      mock: extracted.mock,
      model: extracted.model,
    },
  };

  if (options?.debug) {
    internal.debug = {
      stages,
      variants,
      scoredVariants,
      topVariants,
      recommendedVariant,
    };
  }

  return buildNormalizedPipelineResponse(internal);
}
