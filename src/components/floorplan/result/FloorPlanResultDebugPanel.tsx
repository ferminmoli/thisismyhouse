"use client";

import type { FloorPlanDebugPayload } from "@/lib/architecture/floorPlanPipelineTypes";
import { useState } from "react";

type Props = {
  debug: FloorPlanDebugPayload;
};

export function FloorPlanResultDebugPanel({ debug }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-dashed border-violet-300 bg-violet-50/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-violet-950"
        aria-expanded={open}
      >
        Developer debug
        <span className="text-xs font-normal text-violet-700">
          {open ? "Cerrar" : "Abrir"}
        </span>
      </button>
      {open && (
        <div className="max-h-[480px] space-y-4 overflow-auto border-t border-violet-200/80 px-4 py-4 text-xs">
          <DebugBlock title="Selection" data={debug.selectionMethod} />
          <DebugBlock title="Timings" data={debug.timings} />
          <DebugBlock
            title="Stages"
            data={debug.pipelineStages.map((s) => ({
              id: s.id,
              status: s.status,
              durationMs: s.durationMs,
            }))}
          />
          <DebugBlock
            title="Scoring (internal)"
            data={debug.scoringDetails.map((s) => ({
              variantId: s.variantId,
              rank: s.rank,
              total: s.score.total,
              penalties: s.score.penalties,
            }))}
          />
          <DebugBlock title="Ignored variants" data={debug.ignoredVariants} />
          <DebugBlock
            title="Architectural issues"
            data={debug.architecturalIssues.slice(0, 20)}
          />
          <DebugBlock title="Warnings" data={debug.warnings} />
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
