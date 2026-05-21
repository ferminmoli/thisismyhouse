import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { isProgramMockEnabled } from "@/lib/architectural-program/mock";
import {
  buildSiteBriefFromPreferences,
  buildSiteBriefInterpreterPrompt,
  interpretSiteBriefLocally,
  siteBriefInterpreterSystemInstruction,
  siteBriefOutputSchema,
} from "./site-brief-interpreter";
import { invokeGeminiJson } from "./invoke-gemini-json";
import type { StructuredBrief } from "./types";

export type FetchSiteBriefResult =
  | { ok: true; brief: StructuredBrief; source: "gemini" | "local"; model?: string }
  | { ok: false; error: string; fallback: StructuredBrief };

export async function fetchSiteBrief(
  prefs: UserPreferences,
): Promise<FetchSiteBriefResult> {
  const fallback = interpretSiteBriefLocally(prefs);

  if (isProgramMockEnabled()) {
    return { ok: true, brief: fallback, source: "local" };
  }

  const input = buildSiteBriefFromPreferences(prefs);
  const prompt = buildSiteBriefInterpreterPrompt(input);
  const result = await invokeGeminiJson(
    prompt,
    siteBriefInterpreterSystemInstruction,
    siteBriefOutputSchema,
    0.35,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, fallback };
  }

  return {
    ok: true,
    brief: result.data as StructuredBrief,
    source: "gemini",
    model: result.model,
  };
}
