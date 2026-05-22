import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan } from "./generatedPlan";
import type { TopologyGraph } from "./topologyGraph";
import {
  DEFAULT_MUTATION_TYPES,
  PLAN_MUTATIONS,
  applyMutationPipeline,
  type MutationType,
  type MutatedPlanResult,
} from "./mutations";
import { dedupeStrings } from "./mutationEffect";

export type GeneratePlanVariantsParams = {
  basePlan: GeneratedPlan;
  topologyGraph: TopologyGraph;
  program?: ArchitecturalProgram;
  enabledMutations?: MutationType[];
};

export function generatePlanVariants(
  params: GeneratePlanVariantsParams,
): MutatedPlanResult[] {
  const enabled = new Set(
    params.enabledMutations ?? DEFAULT_MUTATION_TYPES,
  );
  const results: MutatedPlanResult[] = [];

  for (const mutation of PLAN_MUTATIONS) {
    if (!enabled.has(mutation.type)) continue;
    results.push(
      applyMutationPipeline(
        params.basePlan,
        params.topologyGraph,
        mutation,
        params.program,
      ),
    );
  }

  return results;
}

export function summarizeVariants(variants: MutatedPlanResult[]) {
  const okCount = variants.filter((v) => v.status === "ok").length;
  const warnCount = variants.filter((v) => v.status === "warn").length;
  const errorCount = variants.filter((v) => v.status === "error").length;
  const skippedCount = variants.filter((v) => v.status === "skipped").length;
  const eligibleCount = variants.filter((v) => v.eligibleForRanking).length;
  return {
    variantCount: variants.length,
    okCount,
    warnCount,
    errorCount,
    skippedCount,
    eligibleCount,
    variants: variants.map((v) => ({
      mutationType: v.mutationType,
      label: v.label,
      status: v.status,
      eligibleForRanking: v.eligibleForRanking,
      changed: v.effect.changed,
      changedZones: v.effect.changedZones,
      warningCount: v.validation.warnings.length,
      errorCount: v.validation.errors.length,
    })),
  };
}

/** Mensajes únicos para stage output del pipeline. */
export function mutationStageMessages(
  variants: MutatedPlanResult[],
): string[] {
  return dedupeStrings(
    variants
      .filter((v) => v.status !== "ok")
      .flatMap((v) =>
        v.messages.map((m) => `[${v.mutationType}] ${m}`),
      ),
  );
}
