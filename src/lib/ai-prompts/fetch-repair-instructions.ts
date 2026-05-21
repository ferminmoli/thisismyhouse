import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import type { PlanQualityScores } from "@/lib/architectural-templates/plan-scoring";
import {
  buildRepairInstructionsPrompt,
  repairInstructionsSystemInstruction,
} from "./repair-instructions";
import {
  repairInstructionsOutputSchema,
  type RepairInstructionsOutput,
} from "./repair-instructions-types";
import { invokeGeminiJson } from "./invoke-gemini-json";

export type FailedCandidateContext = {
  strategyId: string;
  strategyLabel: string;
  candidateSummary: Record<string, unknown>;
  validationFailures: string[];
  scores: PlanQualityScores;
};

function localRepairInstructions(
  ctx: FailedCandidateContext,
): RepairInstructionsOutput {
  const failures = ctx.validationFailures;
  const s = ctx.scores;

  if (
    failures.some((f) => f.includes("unmapped_rooms")) &&
    failures.filter((f) => f.startsWith("layout_warning")).length > 2
  ) {
    return {
      repairPriority: "discard",
      strategyAdjustments: [],
      areaAdjustments: [],
      adjacencyAdjustments: [],
      templateHints: [],
      discardReason:
        "Demasiados conflictos de plantilla; probar otra estrategia de layout.",
    };
  }

  const templateHints: string[] = [];
  const strategyAdjustments: string[] = [];
  const areaAdjustments: RepairInstructionsOutput["areaAdjustments"] = [];

  if (failures.some((f) => f.includes("patio"))) {
    templateHints.push("patio_wide");
    strategyAdjustments.push("Priorizar conexión living–patio");
    areaAdjustments.push({
      zoneId: "patio",
      change: "increase",
      reason: "Mejorar vínculo exterior",
    });
  }
  if (s.circulationScore < 0.5 || failures.some((f) => f.includes("circulation"))) {
    strategyAdjustments.push("Simplificar circulación desde el distribuidor");
    areaAdjustments.push({
      zoneId: "distributor",
      change: "increase",
      reason: "Circulación más clara",
    });
  }
  if (s.compositionScore < 0.55 || failures.some((f) => f.includes("composition"))) {
    templateHints.push("social_generous");
    areaAdjustments.push({
      zoneId: "living",
      change: "increase",
      reason: "Living más equilibrado",
    });
  }
  if (s.realismScore < 0.5 || failures.some((f) => f.includes("realism"))) {
    templateHints.push("privacy_strong");
    strategyAdjustments.push("Compactar zonas para mejor encaje en plantilla");
  }
  if (templateHints.length === 0) {
    templateHints.push("default");
    strategyAdjustments.push("Rebalancear áreas sociales y privadas");
  }

  const priority: RepairInstructionsOutput["repairPriority"] =
    s.compositeScore < 0.3 ? "high" : s.compositeScore < 0.34 ? "medium" : "low";

  return {
    repairPriority: priority,
    strategyAdjustments,
    areaAdjustments,
    adjacencyAdjustments: [],
    templateHints,
    discardReason: null,
  };
}

export type FetchRepairInstructionsResult =
  | {
      ok: true;
      repair: RepairInstructionsOutput;
      source: "gemini" | "local";
      model?: string;
    }
  | { ok: false; error: string; fallback: RepairInstructionsOutput };

export async function fetchRepairInstructions(
  program: ArchitecturalProgram,
  ctx: FailedCandidateContext,
): Promise<FetchRepairInstructionsResult> {
  const fallback = localRepairInstructions(ctx);

  if (isProgramMockEnabled()) {
    return { ok: true, repair: fallback, source: "local" };
  }

  const prompt = buildRepairInstructionsPrompt({
    candidateSummaryJson: JSON.stringify(ctx.candidateSummary, null, 2),
    validationFailuresJson: JSON.stringify(ctx.validationFailures, null, 2),
    architecturalProgramJson: JSON.stringify(program, null, 2),
  });

  const result = await invokeGeminiJson(
    prompt,
    repairInstructionsSystemInstruction,
    repairInstructionsOutputSchema,
    0.35,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  return {
    ok: true,
    repair: result.data,
    source: "gemini",
    model: result.model,
  };
}
