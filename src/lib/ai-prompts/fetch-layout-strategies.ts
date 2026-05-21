import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import { invokeGeminiJson } from "./invoke-gemini-json";
import {
  buildLayoutStrategiesPrompt,
  defaultLayoutStrategies,
  layoutStrategiesOutputSchema,
  layoutStrategiesSystemInstruction,
  type LayoutStrategySpec,
} from "./layout-strategies";
import type { StructuredBrief } from "./types";

export type FetchLayoutStrategiesResult =
  | {
      ok: true;
      strategies: LayoutStrategySpec[];
      source: "gemini" | "local";
      model?: string;
    }
  | { ok: false; error: string; fallback: LayoutStrategySpec[] };

export async function fetchLayoutStrategies(
  program: ArchitecturalProgram,
  structuredBrief: StructuredBrief,
): Promise<FetchLayoutStrategiesResult> {
  const fallback = defaultLayoutStrategies(structuredBrief);

  if (isProgramMockEnabled()) {
    return { ok: true, strategies: fallback, source: "local" };
  }

  const prompt = buildLayoutStrategiesPrompt({
    architecturalProgramJson: JSON.stringify(program, null, 2),
    structuredBriefJson: JSON.stringify(structuredBrief, null, 2),
  });

  const result = await invokeGeminiJson(
    prompt,
    layoutStrategiesSystemInstruction,
    layoutStrategiesOutputSchema,
    0.55,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  const strategies = result.data.strategies.slice(0, 8);
  if (strategies.length < 2) {
    return { ok: false, error: "Too few strategies", fallback };
  }

  return {
    ok: true,
    strategies,
    source: "gemini",
    model: result.model,
  };
}
