import {
  callGeminiJson,
  extractJsonFromLlmText,
  geminiErrorMessage,
  isRetryableGeminiError,
} from "@/lib/gemini-client";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import {
  architecturalProgramSystemInstruction,
  buildArchitecturalProgramRepairPromptFromOnboarding,
  buildArchitecturalProgramPromptFromOnboarding,
} from "@/lib/ai-prompts";
import { fetchSiteBrief } from "@/lib/ai-prompts/fetch-site-brief";
import {
  buildMockArchitecturalProgram,
  isProgramMockEnabled,
  mockProgramRawJson,
} from "./mock";
import { parseArchitecturalProgram } from "./schema";
import type { ArchitecturalProgram } from "./types";
import { DEFAULT_ALLOWANCE_FACTOR } from "./types";
import {
  createPipelineTrace,
  isPipelineDebugEnabled,
  summarizePreferences,
  summarizeProgram,
} from "@/lib/pipeline-debug";
import type { PipelineDebugTrace } from "@/lib/pipeline-debug";
import { validateProgramSemantics } from "./validate";

export type GenerateArchitecturalProgramCode =
  | "config"
  | "validation"
  | "rate_limit"
  | "service_unavailable";

export type GenerateArchitecturalProgramResult =
  | {
      ok: true;
      program: ArchitecturalProgram;
      rawJson: string;
      model: string;
      repaired: boolean;
      warnings: string[];
      debugTrace?: PipelineDebugTrace;
    }
  | {
      ok: false;
      error: string;
      code: GenerateArchitecturalProgramCode;
      debugTrace?: PipelineDebugTrace;
    };

function normalizeProgramFromPreferences(
  program: ArchitecturalProgram,
  prefs: UserPreferences,
): ArchitecturalProgram {
  const targetM2 =
    Math.round(prefs.lotSize.areaM2 * 10) / 10;

  return {
    ...program,
    globalConfig: {
      ...program.globalConfig,
      targetTotalAreaM2: targetM2,
      allowanceFactor: DEFAULT_ALLOWANCE_FACTOR,
    },
  };
}

async function parseLlmProgramText(
  rawText: string,
): Promise<
  | { ok: true; program: ArchitecturalProgram }
  | { ok: false; error: string }
> {
  let parsed: unknown;
  try {
    parsed = extractJsonFromLlmText(rawText);
  } catch {
    return { ok: false, error: "La respuesta no es JSON parseable" };
  }

  const validated = parseArchitecturalProgram(parsed);
  if (!validated.success) {
    return { ok: false, error: validated.error };
  }

  return { ok: true, program: validated.data };
}

/**
 * Convierte preferencias de onboarding en un programa arquitectónico (JSON)
 * vía LLM, listo para el adaptador y motor geométrico.
 */
export async function generateArchitecturalProgram(
  userPreferences: UserPreferences,
): Promise<GenerateArchitecturalProgramResult> {
  const withDebug = isPipelineDebugEnabled();
  const { trace, push, finish } = createPipelineTrace();

  push({
    id: "onboarding_input",
    phase: "onboarding",
    label: "Preferencias del usuario",
    output: summarizePreferences(userPreferences),
  });

  if (!process.env.GEMINI_API_KEY && !isProgramMockEnabled()) {
    push({
      id: "gemini_config",
      phase: "llm",
      label: "Configuración API",
      status: "error",
      output: { hasApiKey: false, mock: false },
      messages: ["GEMINI_API_KEY ausente"],
    });
    const debugTrace = withDebug ? finish() : undefined;
    return {
      ok: false,
      error:
        "GEMINI_API_KEY no está configurada. Copiá .env.example a .env.local o activá GEMINI_USE_MOCK=true.",
      code: "config",
      debugTrace,
    };
  }

  if (isProgramMockEnabled()) {
    push({
      id: "gemini_config",
      phase: "llm",
      label: "Programa cacheado (sin API)",
      output: {
        mock: true,
        model: "local-program-v2",
        source: "build-local-program.ts",
      },
    });
    const program = normalizeProgramFromPreferences(
      buildMockArchitecturalProgram(userPreferences),
      userPreferences,
    );
    const hints = validateProgramSemantics(
      program,
      userPreferences.lotSize.areaM2,
      userPreferences.planShape,
    );
    push({
      id: "semantic_validate",
      phase: "validate",
      label: "Validación semántica (cache)",
      status: hints.length > 0 ? "warn" : "ok",
      output: summarizeProgram(program),
      messages: hints,
    });
    const debugTrace = withDebug ? finish() : undefined;
    return {
      ok: true,
      program,
      rawJson: mockProgramRawJson(userPreferences),
      model: "local-program-v2",
      repaired: false,
      warnings: [
        "Programa generado localmente (GEMINI_USE_MOCK) — schema Prompt 2 actual.",
        ...hints.slice(0, 5),
      ],
      debugTrace,
    };
  }

  const expectedM2 = userPreferences.lotSize.areaM2;
  let repaired = false;
  let modelUsed = "";

  try {
    push({
      id: "gemini_config",
      phase: "llm",
      label: "Configuración API",
      output: {
        mock: false,
        modelEnv: process.env.GEMINI_MODEL ?? "(default)",
        planShape: userPreferences.planShape,
      },
    });

    const briefResult = await fetchSiteBrief(userPreferences);
    const structuredBrief = briefResult.ok
      ? briefResult.brief
      : briefResult.fallback;

    push({
      id: "site_brief",
      phase: "llm",
      label: "Brief estructurado (Prompt 1)",
      status: briefResult.ok ? "ok" : "warn",
      output: {
        source: briefResult.ok ? briefResult.source : "local_fallback",
        model: briefResult.ok ? briefResult.model : undefined,
        outdoorPriority: structuredBrief.lifestyle.outdoorPriority,
        kitchenMode: structuredBrief.preferences.kitchenMode,
        massingShape: structuredBrief.site.massingShape,
      },
      messages: briefResult.ok ? undefined : [briefResult.error],
    });

    const userPrompt = buildArchitecturalProgramPromptFromOnboarding(
      userPreferences,
      structuredBrief,
    );
    push({
      id: "gemini_prompt",
      phase: "llm",
      label: "Prompt enviado a Gemini",
      output: {
        userPromptChars: userPrompt.length,
        systemPromptChars: architecturalProgramSystemInstruction.length,
        structuredBrief,
        expectedM2,
      },
    });

    const tGemini = Date.now();
    let { text: rawText, model } = await callGeminiJson(userPrompt, {
      systemInstruction: architecturalProgramSystemInstruction,
      temperature: 0.45,
    });
    modelUsed = model;

    push({
      id: "gemini_response",
      phase: "llm",
      label: "Respuesta Gemini (1ª pasada)",
      durationMs: Date.now() - tGemini,
      output: {
        model,
        rawTextChars: rawText.length,
        rawPreview: rawText.slice(0, 200),
      },
    });

    const tParse = Date.now();
    let result = await parseLlmProgramText(rawText);
    push({
      id: "json_parse_zod",
      phase: "validate",
      label: "Parse JSON + Zod",
      durationMs: Date.now() - tParse,
      status: result.ok ? "ok" : "error",
      output: result.ok
        ? { zoneCount: result.program.programmaticZones.length }
        : { error: result.error },
      messages: result.ok ? undefined : [result.error],
    });
    let program = result.ok
      ? normalizeProgramFromPreferences(result.program, userPreferences)
      : null;

    let semanticHints =
      program !== null
        ? validateProgramSemantics(
            program,
            expectedM2,
            userPreferences.planShape,
          )
        : [];

    if (program) {
      push({
        id: "normalize_program",
        phase: "validate",
        label: "Normalización targetTotalAreaM2",
        output: {
          targetFromPrefs: expectedM2,
          targetInProgram: program.globalConfig.targetTotalAreaM2,
        },
      });
      push({
        id: "semantic_validate",
        phase: "validate",
        label: "Validación semántica (1ª pasada)",
        status: semanticHints.length > 0 ? "warn" : "ok",
        output: summarizeProgram(program),
        messages: semanticHints,
      });
    }

    if (!result.ok || semanticHints.length > 0) {
      repaired = true;
      push({
        id: "repair_trigger",
        phase: "llm",
        label: "Disparo reparación",
        status: "warn",
        output: {
          parseOk: result.ok,
          semanticHintCount: semanticHints.length,
        },
        messages: [
          !result.ok ? result.error : null,
          ...semanticHints,
        ].filter((m): m is string => Boolean(m)),
      });
      const issues = [
        !result.ok ? result.error : null,
        ...semanticHints,
      ]
        .filter(Boolean)
        .join("; ");

      ({ text: rawText, model } = await callGeminiJson(
        buildArchitecturalProgramRepairPromptFromOnboarding(
          userPreferences,
          issues,
          structuredBrief,
        ),
        {
          systemInstruction: architecturalProgramSystemInstruction,
          temperature: 0.35,
        },
      ));
      modelUsed = model;

      const tRepair = Date.now();
      result = await parseLlmProgramText(rawText);
      push({
        id: "gemini_repair_response",
        phase: "llm",
        label: "Respuesta Gemini (reparación)",
        durationMs: Date.now() - tRepair,
        output: { model, rawTextChars: rawText.length },
      });
      push({
        id: "json_parse_zod_repair",
        phase: "validate",
        label: "Parse JSON + Zod (reparación)",
        status: result.ok ? "ok" : "error",
        output: result.ok
          ? { zoneCount: result.program.programmaticZones.length }
          : { error: result.error },
      });

      if (!result.ok) {
        const debugTrace = withDebug ? finish() : undefined;
        return {
          ok: false,
          error: `No pudimos validar el programa: ${result.error}`,
          code: "validation",
          debugTrace,
        };
      }
      program = normalizeProgramFromPreferences(
        result.program,
        userPreferences,
      );
      semanticHints = validateProgramSemantics(
        program,
        expectedM2,
        userPreferences.planShape,
      );
      push({
        id: "semantic_validate_repair",
        phase: "validate",
        label: "Validación semántica (post-reparación)",
        status: semanticHints.length > 0 ? "warn" : "ok",
        output: summarizeProgram(program),
        messages: semanticHints,
      });
    }

    if (!program) {
      const debugTrace = withDebug ? finish() : undefined;
      return {
        ok: false,
        error: "No se pudo construir el programa arquitectónico",
        code: "validation",
        debugTrace,
      };
    }

    const warnings = semanticHints.slice(0, 6);
    const debugTrace = withDebug ? finish() : undefined;

    return {
      ok: true,
      program,
      rawJson: rawText,
      model: modelUsed,
      repaired,
      warnings,
      debugTrace,
    };
  } catch (err) {
    const errMsg = geminiErrorMessage(err);
    const isQuota429 = /\b429\b|quota exceeded/i.test(errMsg);

    if (isQuota429) {
      push({
        id: "gemini_quota_fallback",
        phase: "llm",
        label: "Cuota agotada → programa cacheado",
        status: "warn",
        output: { message: errMsg.slice(0, 200) },
      });
      const program = normalizeProgramFromPreferences(
        buildMockArchitecturalProgram(userPreferences),
        userPreferences,
      );
      const hints = validateProgramSemantics(
        program,
        userPreferences.lotSize.areaM2,
        userPreferences.planShape,
      );
      const debugTrace = withDebug ? finish() : undefined;
      return {
        ok: true,
        program,
        rawJson: mockProgramRawJson(userPreferences),
        model: "local-program-v2",
        repaired: false,
        warnings: [
          "Gemini sin cuota (429): se usó el programa cacheado de la última corrida.",
          ...hints.slice(0, 4),
        ],
        debugTrace,
      };
    }

    push({
      id: "gemini_error",
      phase: "llm",
      label: "Error en llamada Gemini",
      status: "error",
      output: { message: errMsg },
    });
    const debugTrace = withDebug ? finish() : undefined;

    if (isRetryableGeminiError(err)) {
      const is503 = /\b503\b|high demand|service unavailable/i.test(
        geminiErrorMessage(err),
      );
      return {
        ok: false,
        error: is503
          ? "Gemini saturado (503). Reintentá en 1–2 min o usá GEMINI_USE_MOCK=true."
          : "Límite o saturación de Gemini. Reintentá más tarde.",
        code: is503 ? "service_unavailable" : "rate_limit",
        debugTrace,
      };
    }
    return {
      ok: false,
      error: geminiErrorMessage(err),
      code: "validation",
      debugTrace,
    };
  }
}
