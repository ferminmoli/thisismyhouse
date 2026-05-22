"use client";

import { FloorplanCanvas } from "@/components/floorplan/FloorplanCanvas";
import { FloorplanLoader } from "@/components/floorplan/FloorplanLoader";
import { FloorplanSidebar } from "@/components/floorplan/FloorplanSidebar";
import { FloorplanVariationPicker } from "@/components/floorplan/FloorplanVariationPicker";
import { FloorplanOnboarding } from "@/components/onboarding/FloorplanOnboarding";
import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { GenerateArchitecturalProgramResult } from "@/lib/architectural-program";
import type {
  LayoutVariation,
  RepairLogEntry,
} from "@/lib/floorplan-layout/generate-layout-variations";
import { FloorplanRepairLog } from "@/components/floorplan/FloorplanRepairLog";
import { FloorplanCriticBanner } from "@/components/floorplan/FloorplanCriticBanner";
import { FloorplanCandidateReview } from "@/components/floorplan/FloorplanCandidateReview";
import { FloorplanOptionExplanation } from "@/components/floorplan/FloorplanOptionExplanation";
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
import { ArchitecturalPipelineDebugPanel } from "@/components/floorplan/ArchitecturalPipelineDebugPanel";
import type { MutationType } from "@/lib/architecture/mutations";
import type { PipelineResult } from "@/lib/architecture/generationPipeline";
import { runArchitecturalPipeline } from "@/lib/architecture/generationPipeline";
import {
  getBaseGeneratedPlan,
  getRecommendedVariantView,
  getTopVariantViews,
  resolveVariantView,
} from "@/lib/architecture/pipelineUiAdapter";
import { buildPromptFromPreferences } from "@/lib/onboarding/user-preferences";
import {
  adaptArchitectureProgramToRenderer,
  adaptGeneratedPlanToRenderer,
} from "@/lib/architecture/adaptGeneratedPlanToRenderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  architecturePipeline: PipelineResult | null;
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
  architecturePipeline: null,
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

  const activeLayout =
    state.layoutVariations[state.selectedVariationIndex]?.layout ?? null;

  const selectedPipelineVariantResult = useMemo(() => {
    const pipe = state.architecturePipeline;
    if (!pipe?.variants.length) return null;
    return (
      resolveVariantView(pipe, selectedPipelineVariant) ??
      resolveVariantView(pipe, "base") ??
      resolveVariantView(pipe, pipe.variants[0]!.mutationType)
    );
  }, [state.architecturePipeline, selectedPipelineVariant]);

  const pipelineRendererBundle = useMemo(() => {
    const pipe = state.architecturePipeline;
    if (!pipe) return null;
    const plan =
      selectedPipelineVariantResult?.plan ?? getBaseGeneratedPlan(pipe);
    if (!plan) return null;
    return {
      layout: adaptGeneratedPlanToRenderer(plan),
      program: adaptArchitectureProgramToRenderer(
        pipe.program,
        pipe.topologyGraph,
      ),
      variant: selectedPipelineVariantResult,
    };
  }, [state.architecturePipeline, selectedPipelineVariantResult]);

  const displayLayout = pipelineRendererBundle?.layout ?? activeLayout;
  const displayProgram =
    pipelineRendererBundle?.program ?? state.program;
  const usingPipelinePlan = pipelineRendererBundle != null;

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
      architecturePipeline: null,
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

      const architecturePipeline = await runArchitecturalPipeline(userPrompt, {
        debug: isPipelineDebugEnabled(),
      });
      if (cancelled) return;
      const recommendedType =
        architecturePipeline.recommendation?.bestVariantId ?? "base";
      setSelectedPipelineVariant(recommendedType);
      setState((s) => ({ ...s, architecturePipeline }));

      try {
        const res = await fetch("/api/architectural-program", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userPreferences: state.preferences }),
        });

        const data: GenerateArchitecturalProgramResult = await res.json();

        if (cancelled) return;

        if (!data.ok) {
          if (isPipelineDebugEnabled()) clientTrace.finish();
          setState((s) => ({
            ...s,
            phase: "ONBOARDING",
            error: data.error,
            program: null,
            layoutVariations: [],
            debugTrace: mergeTraces(clientTrace.trace, data.debugTrace),
          }));
          generateStarted.current = false;
          return;
        }

        if (isPipelineDebugEnabled()) clientTrace.finish();

        setState((s) => ({
          ...s,
          phase: "CALCULATING_LAYOUT",
          program: data.program,
          warnings: data.warnings,
          error: null,
          debugTrace: mergeTraces(clientTrace.trace, data.debugTrace),
        }));
      } catch (err) {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          phase: "ONBOARDING",
          error:
            "Error de red al contactar el servidor. Verificá que `npm run dev` esté activo.",
          program: null,
          layoutVariations: [],
          debugTrace: clientTrace.trace,
        }));
        generateStarted.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.preferences]);

  useEffect(() => {
    if (state.phase !== "CALCULATING_LAYOUT" || !state.program || !state.preferences) {
      return;
    }
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

  const selectedVariation =
    state.layoutVariations[state.selectedVariationIndex];
  const selectedReview =
    state.critic?.candidateReviews.find(
      (r) => r.candidateId === selectedVariation?.optionId,
    ) ?? null;

  const hasDebugTrace =
    isPipelineDebugEnabled() &&
    state.debugTrace != null &&
    state.debugTrace.steps.length > 0;

  const showArchitecturePipeline =
    isPipelineDebugEnabled() && state.architecturePipeline != null;

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

      {state.phase === "GENERATING_PROGRAM" && (
        <>
          <FloorplanLoader
            title="IA definiendo programa espacial…"
            subtitle="Ambientes, relaciones y criterios de diseño — sin geometría fija."
          />
          {showArchitecturePipeline && (
            <ArchitecturalPipelineDebugPanel
              result={state.architecturePipeline}
              selectedVariantType={selectedPipelineVariant}
              onSelectVariant={setSelectedPipelineVariant}
            />
          )}
          {hasDebugTrace && (
            <PipelineDebugPanel
              trace={state.debugTrace}
              title="Debug — hasta API/Gemini"
            />
          )}
        </>
      )}

      {state.phase === "CALCULATING_LAYOUT" && (
        <>
          <FloorplanLoader
            title="Componiendo conceptos arquitectónicos…"
            subtitle="Generando opciones A–E con plantillas curadas y puntuación de calidad."
          />
          {showArchitecturePipeline && (
            <ArchitecturalPipelineDebugPanel
              result={state.architecturePipeline}
              selectedVariantType={selectedPipelineVariant}
              onSelectVariant={setSelectedPipelineVariant}
            />
          )}
          {hasDebugTrace && (
            <PipelineDebugPanel trace={state.debugTrace} />
          )}
        </>
      )}

      {state.phase === "VIEWING_PLAN" &&
        state.preferences &&
        displayProgram &&
        displayLayout && (
          <div className="flex flex-col gap-6">
            {showArchitecturePipeline && (
              <ArchitecturalPipelineDebugPanel
                result={state.architecturePipeline}
                selectedVariantType={selectedPipelineVariant}
                onSelectVariant={setSelectedPipelineVariant}
              />
            )}
            {hasDebugTrace && (
              <PipelineDebugPanel
                trace={state.debugTrace}
                title="Debug — pipeline legacy (plantillas)"
              />
            )}

            {state.repairLog.length > 0 && (
              <FloorplanRepairLog entries={state.repairLog} />
            )}

            {state.critic && state.criticSource && (
              <FloorplanCriticBanner
                critic={state.critic}
                criticSource={state.criticSource}
                variations={state.layoutVariations}
                selectedIndex={state.selectedVariationIndex}
                onSelectRecommended={() => {
                  const idx = state.layoutVariations.findIndex(
                    (v) =>
                      v.optionId === state.critic?.recommendedCandidateId,
                  );
                  if (idx >= 0) {
                    setState((s) => ({ ...s, selectedVariationIndex: idx }));
                  }
                }}
              />
            )}

            <FloorplanVariationPicker
              variations={state.layoutVariations}
              selectedIndex={state.selectedVariationIndex}
              recommendedOptionId={state.critic?.recommendedCandidateId}
              onSelect={(index) =>
                setState((s) => ({ ...s, selectedVariationIndex: index }))
              }
            />

            {selectedReview && <FloorplanCandidateReview review={selectedReview} />}

            {selectedVariation && (
              <FloorplanOptionExplanation
                key={`${state.variationGeneration}-${state.selectedVariationIndex}`}
                variation={selectedVariation}
                program={displayProgram}
                preferences={state.preferences}
              />
            )}

            {state.architecturePipeline?.recommendation && (
              <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm text-violet-950">
                <p className="font-semibold">
                  Recomendación:{" "}
                  {state.architecturePipeline.recommendation.bestVariantLabel}
                  {state.architecturePipeline.ranking[0] && (
                    <span className="ml-2 text-violet-700">
                      (
                      {state.architecturePipeline.ranking[0].totalScore}
                      /100)
                    </span>
                  )}
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {state.architecturePipeline.recommendation.why.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {usingPipelinePlan && state.architecturePipeline?.variants.length ? (
              <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-950">
                <p>
                  Variante del <strong>Mutation Engine</strong> (plantilla{" "}
                  <code className="text-xs">l_shape_patio</code>). Las opciones
                  A–E legacy siguen abajo para comparar.
                </p>
                <div className="flex flex-wrap gap-2">
                  {state.architecturePipeline.variants.map((v) => {
                    const rank = state.architecturePipeline?.ranking.find(
                      (t) => t.mutationType === v.mutationType,
                    )?.rank;
                    return (
                    <button
                      key={v.mutationType}
                      type="button"
                      onClick={() =>
                        setSelectedPipelineVariant(v.mutationType)
                      }
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition ${
                        selectedPipelineVariant === v.mutationType
                          ? "bg-teal-700 text-white ring-teal-800"
                          : "bg-white text-teal-900 ring-teal-200 hover:bg-teal-100"
                      }`}
                    >
                      {rank != null && (
                        <span className="mr-1 font-bold text-violet-600">
                          #{rank}
                        </span>
                      )}
                      {v.label}
                      <span
                        className={`ml-1.5 rounded px-1 py-0.5 text-[10px] uppercase ${
                          v.status === "ok"
                            ? "bg-emerald-200 text-emerald-900"
                            : v.status === "skipped"
                              ? "bg-stone-200 text-stone-700"
                              : v.status === "warn"
                                ? "bg-amber-200 text-amber-900"
                                : "bg-red-200 text-red-900"
                        }`}
                      >
                        {v.status}
                      </span>
                      {!v.eligibleForRanking && (
                        <span className="ml-1 text-[9px] text-stone-500">
                          · no ranking
                        </span>
                      )}
                    </button>
                    );
                  })}
                </div>
                {selectedPipelineVariantResult &&
                  selectedPipelineVariantResult.status !== "ok" && (
                    <ul className="list-disc pl-5 text-xs text-amber-950">
                      {selectedPipelineVariantResult.messages.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
              </div>
            ) : usingPipelinePlan ? (
              <div className="rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm text-teal-950">
                Plano visible generado por el{" "}
                <strong>Parametric Parti Generator</strong> (plantilla{" "}
                <code className="text-xs">l_shape_patio</code>).
              </div>
            ) : null}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <FloorplanSidebar
                preferences={state.preferences}
                program={displayProgram}
                layout={displayLayout}
                selectedOption={
                  state.layoutVariations[state.selectedVariationIndex]
                }
                warnings={[
                  ...state.warnings,
                  ...(selectedPipelineVariantResult?.validation.warnings ??
                    state.architecturePipeline?.generatedPlanValidation
                      .warnings ??
                    []),
                ].slice(0, 8)}
                onAnotherLayout={handleMoreVariations}
                onRegenerate={resetToOnboarding}
              />
              <div className="min-w-0 flex-1 rounded-2xl bg-gradient-to-b from-stone-100/80 to-stone-200/40 p-3 ring-1 ring-stone-200/50">
                <FloorplanCanvas
                  program={displayProgram}
                  layout={displayLayout}
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
