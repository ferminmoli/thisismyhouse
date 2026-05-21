import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import {
  buildLocalArchitecturalProgram,
  localProgramToJson,
} from "./build-local-program";

export const CACHED_PROGRAM_BASE_M2 = 100;

export function isProgramMockEnabled(): boolean {
  const v = process.env.GEMINI_USE_MOCK?.toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  if (!process.env.GEMINI_API_KEY?.trim()) return true;
  return false;
}

/**
 * Programa sin Gemini: generado localmente según onboarding (schema Prompt 2 actual).
 */
export function buildMockArchitecturalProgram(
  prefs: UserPreferences,
): ReturnType<typeof buildLocalArchitecturalProgram> {
  return buildLocalArchitecturalProgram(prefs);
}

export function mockProgramRawJson(prefs: UserPreferences): string {
  return localProgramToJson(prefs);
}
