"use client";

import { FloorplanLoader } from "@/components/floorplan/FloorplanLoader";
import { FloorplanOnboarding } from "@/components/onboarding/FloorplanOnboarding";
import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type {
  LayoutVariation,
  RepairLogEntry,
} from "@/lib/floorplan-layout/generate-layout-variations";
import type { CandidateCriticOutput } from "@/lib/ai-prompts/candidate-critic-types";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import {
  createPipelineTrace,
  isPipelineDebugEnabled,
  mergeTraces,
  summarizePreferences,
  type PipelineDebugTrace,
} from "@/lib/pipeline-debug";
import { PipelineDebugPanel } from "@/components/floorplan/PipelineDebugPanel";
import type { MutationType } from "@/lib/architecture/mutations";
import { runFloorPlanPipeline } from "@/lib/architecture/floorPlanPipeline";
import type { FloorPlanPipelineResult } from "@/lib/architecture/floorPlanPipelineTypes";
import {
  FloorPlanResultView,
  pipelineResultToPresented,
} from "@/components/floorplan/result/FloorPlanResultPage";
import { buildPromptFromPreferences } from "@/lib/onboarding/user-preferences";
import { useCallback, useEffect, useRef, useState } from "react";

export type FloorplanAppPhase =
  | "ONBOARDING"
  | "GENERATING_PROGRAM"
  | "CALCULATING_LAYOUT"
  | "VIEWING_PLAN";

const LAYOUT_MIN_MS = 600;

type FloorplanAppState = {
  phase: FloorplanAppPhase;
  preferences: UserPreferences | null;
  program: ArchitecturalProgram | null;
  layoutVariations: LayoutVariation[];
  selectedVariationIndex: number;
  variationGeneration: number;
  error: string | null;
  warnings: string[];
  debugTrace: PipelineDebugTrace | null;
  floorPlanPipeline: FloorPlanPipelineResult | null;
  critic: CandidateCriticOutput | null;
  criticSource: "gemini" | "local" | null;
  repairLog: RepairLogEntry[];
};

const INITIAL_STATE: FloorplanAppState = {
  phase: "ONBOARDING",
  preferences: null,
  program: null,
  layoutVariations: [],
  selectedVariationIndex: 0,
  variationGeneration: 0,
  error: null,
  warnings: [],
  debugTrace: null,
  floorPlanPipeline: null,
  critic: null,
  criticSource: null,
  repairLog: [],
};

export function FloorplanApp() {
  const [state, setState] = useState<FloorplanAppState>(INITIAL_STATE);
  const [selectedPipelineVariant, setSelectedPipelineVariant] =
    useState<MutationType>("base");
  const generateStarted = useRef(false);
  const layoutStarted = useRef(false);

  const resetToOnboarding = useCallback(() => {
    generateStarted.current = false;
    layoutStarted.current = false;
    setSelectedPipelineVariant("base");
    setState(INITIAL_STATE);
  }, []);

  const handleOnboardingComplete = useCallback((preferences: UserPreferences) => {
    generateStarted.current = false;
    layoutStarted.current = false;
    setState({
      phase: "GENERATING_PROGRAM",
      preferences,
      program: null,
      layoutVariations: [],
      selectedVariationIndex: 0,
      variationGeneration: 0,
      error: null,
      warnings: [],
      debugTrace: null,
      floorPlanPipeline: null,
      critic: null,
      criticSource: null,
      repairLog: [],
    });
  }, []);

  const fetchLayoutVariations = useCallback(
    async (
      program: ArchitecturalProgram,
      preferences: UserPreferences,
    ): Promise<{
      variations: LayoutVariation[];
      warning?: string;
      critic?: CandidateCriticOutput;
      criticSource?: "gemini" | "local";
      repairLog?: RepairLogEntry[];
    }> => {
      const res = await fetch("/api/generate-variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program,
          userPreferences: preferences,
          maxOptions: 5,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error ?? "No se pudieron generar variaciones");
      }
      return {
        variations: data.variations as LayoutVariation[],
        warning: (data.strategiesWarning ?? data.criticWarning) as
          | string
          | undefined,
        critic: data.critic as CandidateCriticOutput | undefined,
        criticSource: data.criticSource as "gemini" | "local" | undefined,
        repairLog: (data.repairLog as RepairLogEntry[] | undefined) ?? [],
      };
    },
    [],
  );

  const applyVariationsToState = useCallback(
    (
      variations: LayoutVariation[],
      extra?: {
        warning?: string;
        critic?: CandidateCriticOutput;
        criticSource?: "gemini" | "local";
        repairLog?: RepairLogEntry[];
        bumpGeneration?: boolean;
      },
    ) => {
      setState((s) => ({
        ...s,
        phase: "VIEWING_PLAN",
        layoutVariations: variations,
        selectedVariationIndex: 0,
        variationGeneration: extra?.bumpGeneration
          ? s.variationGeneration + 1
          : s.variationGeneration,
        critic: extra?.critic ?? null,
        criticSource: extra?.criticSource ?? null,
        repairLog: extra?.repairLog ?? [],
        warnings: [
          ...s.warnings,
          ...(extra?.warning ? [extra.warning] : []),
          ...(variations[0]?.layout.warnings ?? []),
        ].slice(0, 8),
      }));
    },
    [],
  );

  const handleMoreVariations = useCallback(async () => {
    const program = state.program;
    const preferences = state.preferences;
    if (state.phase !== "VIEWING_PLAN" || !program || !preferences) return;

    try {
      const { variations, warning, critic, criticSource, repairLog } =
        await fetchLayoutVariations(program, preferences);
      applyVariationsToState(variations, {
        warning,
        critic,
        criticSource,
        repairLog,
        bumpGeneration: true,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        warnings: [
          ...s.warnings,
          err instanceof Error
            ? err.message
            : "Error al regenerar opciones A–E",
        ].slice(0, 8),
      }));
    }
  }, [
    state.phase,
    state.program,
    state.preferences,
    fetchLayoutVariations,
    applyVariationsToState,
  ]);

  useEffect(() => {
    if (state.phase !== "GENERATING_PROGRAM" || !state.preferences) return;
    if (generateStarted.current) return;
    generateStarted.current = true;

    let cancelled = false;

    (async () => {
      const clientTrace = createPipelineTrace();
      const userPrompt = buildPromptFromPreferences(state.preferences!);
      clientTrace.push({
        id: "client_onboarding",
        phase: "client",
        label: "Onboarding completado (cliente)",
        output: summarizePreferences(state.preferences!),
      });

      const floorPlanPipeline = await runFloorPlanPipeline(userPrompt);
      if (cancelled) return;

      if (isPipelineDebugEnabled()) clientTrace.finish();

      if (floorPlanPipeline.status === "failed") {
        setState((s) => ({
          ...s,
          phase: "ONBOARDING",
          error:
            "No pudimos generar un concepto válido con tu brief. Probá ajustar ambientes o superficie.",
          floorPlanPipeline,
          program: null,
          layoutVariations: [],
          debugTrace: clientTrace.trace,
        }));
        generateStarted.current = false;
        return;
      }

      const recommendedType =
        (floorPlanPipeline.publicResult.recommendedVariant.id ??
          "base") as MutationType;
      setSelectedPipelineVariant(recommendedType);

      setState((s) => ({
        ...s,
        phase: "VIEWING_PLAN",
        program: null,
        floorPlanPipeline,
        layoutVariations: [],
        critic: null,
        criticSource: null,
        repairLog: [],
        warnings: [],
        error: null,
        debugTrace: clientTrace.trace,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.preferences]);

  useEffect(() => {
    if (state.phase !== "CALCULATING_LAYOUT" || !state.program || !state.preferences) {
      return;
    }
    if (state.floorPlanPipeline) return;
    if (layoutStarted.current) return;
    layoutStarted.current = true;

    let cancelled = false;
    const started = Date.now();

    (async () => {
      try {
        const { variations, warning, critic, criticSource, repairLog } =
          await fetchLayoutVariations(state.program!, state.preferences!);
        const elapsed = Date.now() - started;
        const delay = Math.max(0, LAYOUT_MIN_MS - elapsed);
        await new Promise((r) => window.setTimeout(r, delay));
        if (cancelled) return;
        applyVariationsToState(variations, {
          warning,
          critic,
          criticSource,
          repairLog,
        });
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          phase: "ONBOARDING",
          error:
            err instanceof Error
              ? err.message
              : "Error al generar opciones de layout",
          layoutVariations: [],
        }));
        layoutStarted.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    state.phase,
    state.program,
    state.preferences,
    fetchLayoutVariations,
    applyVariationsToState,
  ]);

  const hasDebugTrace =
    isPipelineDebugEnabled() &&
    state.debugTrace != null &&
    state.debugTrace.steps.length > 0;

  const showConceptResult =
    state.phase === "GENERATING_PROGRAM" ||
    (state.phase === "VIEWING_PLAN" && state.floorPlanPipeline != null);

  /** Plantillas A–E, critic y recomendación conceptual (flujo Maket legacy). */
  const showLegacyTemplateUi = state.floorPlanPipeline == null;

  return (
    <div className="space-y-6">
      {state.phase === "ONBOARDING" && hasDebugTrace && (
        <PipelineDebugPanel
          trace={state.debugTrace}
          title="Debug — falló antes del plano"
        />
      )}

      {state.phase === "ONBOARDING" && (
        <>
          {state.error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              {state.error}
            </div>
          )}
          <FloorplanOnboarding onComplete={handleOnboardingComplete} />
        </>
      )}

      {showConceptResult && (
        <div className="rounded-3xl bg-white/70 p-4 shadow-sm ring-1 ring-stone-200/60 sm:p-6 lg:p-8">
          <FloorPlanResultView
            result={pipelineResultToPresented(state.floorPlanPipeline)}
            loading={!state.floorPlanPipeline}
            error={
              state.floorPlanPipeline?.status === "failed"
                ? "No pudimos generar un concepto válido con tu brief."
                : null
            }
            onVariantChange={(id) =>
              setSelectedPipelineVariant(id as MutationType)
            }
          />
          {state.phase === "VIEWING_PLAN" && state.floorPlanPipeline && (
            <div className="mt-6 flex flex-wrap gap-3 border-t border-stone-200/80 pt-6">
              <button
                type="button"
                onClick={resetToOnboarding}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Nuevo brief
              </button>
            </div>
          )}
        </div>
      )}

      {state.phase === "GENERATING_PROGRAM" && !state.floorPlanPipeline && (
        <>
          <FloorplanLoader
            title="IA definiendo programa espacial…"
            subtitle="Ambientes, relaciones y criterios de diseño — sin geometría fija."
          />
          {hasDebugTrace && (
            <PipelineDebugPanel
              trace={state.debugTrace}
              title="Debug — hasta API/Gemini"
            />
          )}
        </>
      )}

      {state.phase === "CALCULATING_LAYOUT" && showLegacyTemplateUi && (
        <>
          <FloorplanLoader
            title="Componiendo conceptos arquitectónicos…"
            subtitle="Generando opciones A–E con plantillas curadas y puntuación de calidad."
          />
          {hasDebugTrace && (
            <PipelineDebugPanel trace={state.debugTrace} />
          )}
        </>
      )}

    </div>
  );
}
