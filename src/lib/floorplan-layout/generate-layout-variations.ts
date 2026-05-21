import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { applyRepairToStrategy } from "@/lib/ai-prompts/apply-repair-to-strategy";
import { fetchCandidateCritic } from "@/lib/ai-prompts/fetch-candidate-critic";
import type { CandidateCriticOutput } from "@/lib/ai-prompts/candidate-critic-types";
import {
  fetchLayoutStrategies,
} from "@/lib/ai-prompts/fetch-layout-strategies";
import type { LayoutStrategySpec } from "@/lib/ai-prompts/layout-strategies";
import {
  defaultLayoutStrategies,
  localVariationStrategyFromId,
  templateVariantFromStrategyId,
} from "@/lib/ai-prompts/layout-strategies";
import {
  fetchRepairInstructions,
  type FailedCandidateContext,
} from "@/lib/ai-prompts/fetch-repair-instructions";
import type { RepairInstructionsOutput } from "@/lib/ai-prompts/repair-instructions-types";
import { structuredBriefFromPreferences } from "@/lib/ai-prompts/types";
import { applyTemplateLayout } from "@/lib/architectural-templates/apply-template-layout";
import {
  passesQualityGate,
  scoreFloorplanLayout,
  type PlanQualityScores,
} from "@/lib/architectural-templates/plan-scoring";
import type { TemplateVariantId } from "@/lib/architectural-templates/template-variants";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { collectValidationFailures } from "./variation-validation";
import type { FloorplanLayoutResult } from "./types";

export type LayoutVariationStrategy =
  | "balanced"
  | "social_focus"
  | "compact"
  | "patio_life"
  | "privacy"
  | "integrated_kitchen";

export type LayoutVariation = {
  optionId: string;
  label: string;
  description: string;
  strategy: LayoutVariationStrategy;
  strategyId: string;
  variantId: TemplateVariantId;
  layout: FloorplanLayoutResult;
  scores: PlanQualityScores;
  /** True si pasó por Prompt 5 y reintento. */
  repaired?: boolean;
};

export type RepairLogEntry = {
  strategyId: string;
  strategyLabel: string;
  failures: string[];
  repair: RepairInstructionsOutput;
  repairSource: "gemini" | "local";
  recovered: boolean;
};

export type GenerateVariationsInput = {
  program: ArchitecturalProgram;
  planShape: UserPreferences["planShape"];
  preferences?: UserPreferences;
  maxOptions?: number;
  strategies?: LayoutStrategySpec[];
};

type CompileCandidateResult = {
  scores: PlanQualityScores;
  layout: FloorplanLayoutResult;
  meta: NonNullable<FloorplanLayoutResult["templateMeta"]>;
  failures: string[];
  passedGate: boolean;
};

function compileCandidate(
  strategySpec: LayoutStrategySpec,
  program: ArchitecturalProgram,
  planShape: UserPreferences["planShape"],
  preferences: UserPreferences | undefined,
  layoutSeed: number,
  variantIdOverride?: TemplateVariantId,
): CompileCandidateResult {
  const variantId =
    variantIdOverride ?? templateVariantFromStrategyId(strategySpec.id);
  const { layout, meta } = applyTemplateLayout({
    program,
    planShape,
    preferences,
    layoutSeed,
    variantId,
    selectionReasonSuffix: strategySpec.label,
  });
  const scores = scoreFloorplanLayout(layout, program);
  const failures = collectValidationFailures(scores, layout);
  const passedGate = passesQualityGate(scores);

  return {
    scores,
    layout: { ...layout, templateMeta: meta, planScores: scores },
    meta,
    failures,
    passedGate,
  };
}

function toVariation(
  optionLetter: string,
  strategySpec: LayoutStrategySpec,
  compiled: CompileCandidateResult,
  variantId: TemplateVariantId,
  repaired = false,
): LayoutVariation | null {
  if (!compiled.passedGate) return null;

  return {
    optionId: optionLetter,
    label: `Opción ${optionLetter}`,
    description: strategySpec.description,
    strategy: localVariationStrategyFromId(strategySpec.id),
    strategyId: strategySpec.id,
    variantId,
    layout: compiled.layout,
    scores: compiled.scores,
    repaired,
  };
}

function buildVariation(
  optionLetter: string,
  strategySpec: LayoutStrategySpec,
  program: ArchitecturalProgram,
  planShape: UserPreferences["planShape"],
  preferences: UserPreferences | undefined,
  layoutSeed: number,
  variantIdOverride?: TemplateVariantId,
): LayoutVariation | null {
  const variantId =
    variantIdOverride ?? templateVariantFromStrategyId(strategySpec.id);
  const compiled = compileCandidate(
    strategySpec,
    program,
    planShape,
    preferences,
    layoutSeed,
    variantId,
  );
  return toVariation(optionLetter, strategySpec, compiled, variantId);
}

function failedCandidateContext(
  strategySpec: LayoutStrategySpec,
  compiled: CompileCandidateResult,
  variantId: TemplateVariantId,
): FailedCandidateContext {
  return {
    strategyId: strategySpec.id,
    strategyLabel: strategySpec.label,
    validationFailures: compiled.failures,
    scores: compiled.scores,
    candidateSummary: {
      strategyId: strategySpec.id,
      strategyLabel: strategySpec.label,
      templateId: compiled.meta.templateId,
      templateLabel: compiled.meta.templateLabel,
      variantId,
      fillRatio: compiled.layout.fillRatio,
      warnings: compiled.layout.warnings.slice(0, 5),
      localQualityScores: {
        composite: Math.round(compiled.scores.compositeScore * 100),
        realism: Math.round(compiled.scores.realismScore * 100),
      },
    },
  };
}

async function tryStrategyWithRepair(
  optionLetter: string,
  strategySpec: LayoutStrategySpec,
  input: GenerateVariationsInput,
  layoutSeed: number,
  enableRepair: boolean,
): Promise<{ variation: LayoutVariation | null; repairLog?: RepairLogEntry }> {
  const variantId = templateVariantFromStrategyId(strategySpec.id);
  const compiled = compileCandidate(
    strategySpec,
    input.program,
    input.planShape,
    input.preferences,
    layoutSeed,
    variantId,
  );

  let variation = toVariation(optionLetter, strategySpec, compiled, variantId);
  if (variation || !enableRepair) {
    return { variation };
  }

  const ctx = failedCandidateContext(strategySpec, compiled, variantId);
  const repairResult = await fetchRepairInstructions(input.program, ctx);
  const repair = repairResult.ok ? repairResult.repair : repairResult.fallback;
  const repairSource = repairResult.ok ? repairResult.source : "local";

  if (repair.repairPriority === "discard") {
    return {
      variation: null,
      repairLog: {
        strategyId: strategySpec.id,
        strategyLabel: strategySpec.label,
        failures: compiled.failures,
        repair,
        repairSource,
        recovered: false,
      },
    };
  }

  const applied = applyRepairToStrategy(
    strategySpec,
    repair,
    compiled.failures,
  );
  const retryCompiled = compileCandidate(
    applied.strategy,
    input.program,
    input.planShape,
    input.preferences,
    layoutSeed + 100,
    applied.variantId,
  );
  variation = toVariation(
    optionLetter,
    applied.strategy,
    retryCompiled,
    applied.variantId,
    true,
  );

  return {
    variation,
    repairLog: {
      strategyId: strategySpec.id,
      strategyLabel: strategySpec.label,
      failures: compiled.failures,
      repair,
      repairSource,
      recovered: variation != null,
    },
  };
}

function resolveBrief(input: GenerateVariationsInput) {
  if (input.preferences) {
    return structuredBriefFromPreferences(input.preferences);
  }
  return structuredBriefFromPreferences({
    basicNeeds: "",
    roomCounts: {
      bedrooms: 2,
      bathrooms: 1,
      kitchens: 1,
      living: 1,
      patio: 0,
      garage: 0,
    },
    floorCount: 1,
    lotSize: {
      value: input.program.globalConfig.targetTotalAreaM2,
      unit: "m2",
      areaM2: input.program.globalConfig.targetTotalAreaM2,
    },
    planShape: input.planShape,
    completedAt: new Date().toISOString(),
  });
}

export function generateLayoutVariationsFromStrategies(
  input: GenerateVariationsInput,
  strategies: LayoutStrategySpec[],
): LayoutVariation[] {
  const max = input.maxOptions ?? 5;
  const letters = ["A", "B", "C", "D", "E"];
  const results: LayoutVariation[] = [];

  for (let i = 0; i < Math.min(strategies.length, max); i++) {
    const v = buildVariation(
      letters[i],
      strategies[i],
      input.program,
      input.planShape,
      input.preferences,
      i + 1,
    );
    if (v) results.push(v);
  }

  if (results.length === 0 && strategies[0]) {
    const fallback = buildVariation(
      "A",
      strategies[0],
      input.program,
      input.planShape,
      input.preferences,
      1,
    );
    if (fallback) results.push(fallback);
  }

  return results.sort(
    (a, b) => b.scores.compositeScore - a.scores.compositeScore,
  );
}

async function generateLayoutVariationsFromStrategiesWithRepair(
  input: GenerateVariationsInput,
  strategies: LayoutStrategySpec[],
): Promise<{ variations: LayoutVariation[]; repairLog: RepairLogEntry[] }> {
  const max = input.maxOptions ?? 5;
  const letters = ["A", "B", "C", "D", "E"];
  const results: LayoutVariation[] = [];
  const repairLog: RepairLogEntry[] = [];

  for (let i = 0; i < Math.min(strategies.length, max); i++) {
    const { variation, repairLog: entry } = await tryStrategyWithRepair(
      letters[i],
      strategies[i],
      input,
      i + 1,
      true,
    );
    if (entry) repairLog.push(entry);
    if (variation) results.push(variation);
  }

  if (results.length === 0 && strategies[0]) {
    const { variation, repairLog: entry } = await tryStrategyWithRepair(
      "A",
      strategies[0],
      input,
      1,
      true,
    );
    if (entry) repairLog.push(entry);
    if (variation) results.push(variation);
  }

  return {
    variations: results.sort(
      (a, b) => b.scores.compositeScore - a.scores.compositeScore,
    ),
    repairLog,
  };
}

export function generateLayoutVariations(
  input: GenerateVariationsInput,
): LayoutVariation[] {
  const brief = resolveBrief(input);
  const strategies =
    input.strategies ?? defaultLayoutStrategies(brief);
  return generateLayoutVariationsFromStrategies(input, strategies);
}

export type GenerateVariationsAsyncResult = {
  variations: LayoutVariation[];
  strategiesSource: "gemini" | "local";
  strategiesModel?: string;
  strategiesError?: string;
  critic?: CandidateCriticOutput;
  criticSource?: "gemini" | "local";
  criticModel?: string;
  criticError?: string;
  repairLog?: RepairLogEntry[];
};

export async function generateLayoutVariationsAsync(
  input: GenerateVariationsInput,
): Promise<GenerateVariationsAsyncResult> {
  const brief = resolveBrief(input);

  let strategiesSource: "gemini" | "local" = "local";
  let strategiesModel: string | undefined;
  let strategiesError: string | undefined;
  let strategies: LayoutStrategySpec[];

  if (input.strategies?.length) {
    strategies = input.strategies;
  } else {
    const fetched = await fetchLayoutStrategies(input.program, brief);
    strategies = fetched.ok ? fetched.strategies : fetched.fallback;
    strategiesSource = fetched.ok ? fetched.source : "local";
    strategiesModel = fetched.ok ? fetched.model : undefined;
    strategiesError = fetched.ok ? undefined : fetched.error;
  }

  const { variations, repairLog } =
    await generateLayoutVariationsFromStrategiesWithRepair(input, strategies);

  const criticResult = await fetchCandidateCritic(
    variations,
    input.program,
    brief,
  );

  return {
    variations,
    strategiesSource,
    strategiesModel,
    strategiesError,
    critic: criticResult.ok ? criticResult.critic : criticResult.fallback,
    criticSource: criticResult.ok ? criticResult.source : "local",
    criticModel: criticResult.ok ? criticResult.model : undefined,
    criticError: criticResult.ok ? undefined : criticResult.error,
    repairLog: repairLog.length > 0 ? repairLog : undefined,
  };
}
