"use client";

import type { FloorPlanDebug } from "@/lib/architecture/floorPlanPipelineTypes";
import type { PublicPlanGeometry } from "@/lib/architecture/floorPlanPipelineTypes";
import { useState } from "react";
import { ConceptualPlanRenderer } from "./ConceptualPlanRenderer";

type Props = {
  debug: FloorPlanDebug;
  plan?: PublicPlanGeometry;
  title?: string;
  variantLabel?: string;
  variantId?: string;
  wallGraphDebug?: boolean;
  onWallGraphDebugChange?: (enabled: boolean) => void;
};

export function FloorPlanResultDebugPanel({
  debug,
  plan,
  title = "Debug",
  variantLabel = "",
  variantId = "debug",
  wallGraphDebug = false,
  onWallGraphDebugChange,
}: Props) {
  const [open, setOpen] = useState(false);

  const stages = (debug.stages ?? []) as Array<{
    id: string;
    status: string;
    durationMs?: number;
  }>;

  const scoringDetails = (debug.scoredVariants ?? []) as Array<{
    mutationType?: string;
    rank?: number;
    score?: { total?: number; penalties?: unknown };
  }>;

  return (
    <section
      className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40"
      data-testid="floor-plan-debug-panel"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-violet-950"
        aria-expanded={open}
        data-testid="floor-plan-debug-toggle"
      >
        Developer debug
        <span className="text-xs font-normal text-violet-700">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </button>
      {open && (
        <div className="max-h-[min(85vh,720px)] space-y-4 overflow-auto border-t border-violet-200/80 px-4 py-4 text-xs">
          <label
            className="flex cursor-pointer items-start gap-2 rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2.5"
            data-testid="wall-graph-debug-toggle"
          >
            <input
              type="checkbox"
              checked={wallGraphDebug}
              onChange={(e) => onWallGraphDebugChange?.(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="font-semibold text-violet-950">wallGraphDebug</span>
              <span className="mt-0.5 block text-violet-800">
                Muestra WallGraphLayer en el plano principal: muros gruesos,
                IDs, candidatos exteriores (ámbar) y cortes de aberturas (rojo).
                Desactivado = solo SimpleRoomBoundaryLayer (público).
              </span>
            </span>
          </label>

          {plan && plan.zones.length > 0 ? (
            <div data-testid="debug-conceptual-plan-section">
              <p className="mb-2 font-semibold text-violet-900">
                Conceptual / debug SVG (legacy renderer)
              </p>
              <ConceptualPlanRenderer
                key={variantId}
                plan={plan}
                title={title}
                variantLabel={variantLabel}
                variantId={variantId}
              />
            </div>
          ) : null}
          <DebugBlock title="Selection" data={debug.selectionMethod} />
          <DebugBlock title="Timings" data={debug.timings} />
          <DebugBlock
            title="Stages"
            data={stages.map((s) => ({
              id: s.id,
              status: s.status,
              durationMs: s.durationMs,
            }))}
          />
          <DebugBlock
            title="Scoring (internal)"
            data={scoringDetails.map((s) => ({
              variantId: s.mutationType,
              rank: s.rank,
              total: s.score?.total,
              penalties: s.score?.penalties,
            }))}
          />
          <DebugBlock
            title="Ignored variants"
            data={(debug.rawOutput as { ignoredVariants?: unknown })?.ignoredVariants}
          />
          <DebugBlock
            title="Architectural issues"
            data={(debug.architecturalIssues ?? []).slice(0, 20)}
          />
          <DebugBlock title="Warnings" data={debug.warnings} />
          <DebugBlock title="Raw output (excerpt)" data={debug.rawOutput} />
        </div>
      )}
    </section>
  );
}

function DebugBlock({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <p className="mb-1 font-semibold text-violet-900">{title}</p>
      <pre className="overflow-x-auto rounded-lg bg-white/80 p-2 text-[10px] text-violet-950 ring-1 ring-violet-100">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
