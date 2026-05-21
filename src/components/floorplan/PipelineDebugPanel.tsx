"use client";

import type { PipelineDebugStep, PipelineDebugTrace } from "@/lib/pipeline-debug";
import { useMemo, useState } from "react";

const STATUS_STYLES: Record<
  PipelineDebugStep["status"],
  { dot: string; border: string }
> = {
  ok: { dot: "bg-emerald-500", border: "border-emerald-200" },
  warn: { dot: "bg-amber-500", border: "border-amber-200" },
  error: { dot: "bg-red-500", border: "border-red-200" },
  skip: { dot: "bg-stone-400", border: "border-stone-200" },
};

type Props = {
  trace: PipelineDebugTrace | null;
  title?: string;
};

export function PipelineDebugPanel({ trace, title = "Pipeline debug" }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const steps = trace?.steps ?? [];
  const errorCount = steps.filter((s) => s.status === "error").length;
  const warnCount = steps.filter((s) => s.status === "warn").length;

  const jsonExport = useMemo(
    () => (trace ? JSON.stringify(trace, null, 2) : ""),
    [trace],
  );

  if (!trace || steps.length === 0) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonExport);
    setCopyOk(true);
    window.setTimeout(() => setCopyOk(false), 2000);
  };

  return (
    <section
      className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4 font-mono text-xs text-stone-800 shadow-sm"
      aria-label="Depuración del pipeline"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-600">
            {title}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {steps.length} pasos · {warnCount} warn · {errorCount} error
            {trace.finishedAt ? ` · ${trace.startedAt}` : " · en curso…"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-medium text-violet-800 ring-1 ring-violet-200 hover:bg-violet-50"
        >
          {copyOk ? "Copiado" : "Copiar JSON"}
        </button>
      </div>

      <ol className="max-h-[min(70vh,520px)] space-y-2 overflow-y-auto pr-1">
        {steps.map((step, index) => {
          const open = expandedId === step.id;
          const style = STATUS_STYLES[step.status];
          return (
            <li
              key={`${step.id}-${index}`}
              className={`rounded-xl border bg-white/80 ${style.border}`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left"
                onClick={() =>
                  setExpandedId(open ? null : step.id)
                }
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase text-stone-400">
                    {index + 1}. {step.phase}
                  </span>
                  <span className="mt-0.5 block font-medium text-stone-900">
                    {step.label}
                  </span>
                  {step.durationMs != null && (
                    <span className="text-stone-500">
                      {step.durationMs} ms
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-stone-400">{open ? "▾" : "▸"}</span>
              </button>
              {open && (
                <div className="border-t border-stone-100 px-3 py-2">
                  {step.messages && step.messages.length > 0 && (
                    <ul className="mb-2 list-disc pl-4 text-amber-900">
                      {step.messages.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  )}
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-stone-700">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[10px] text-stone-500">
        Consola: grupos <code className="text-violet-700">PIPELINE DEBUG</code>.
        Forzá panel con <code>NEXT_PUBLIC_PIPELINE_DEBUG=true</code> en{" "}
        <code>.env</code>.
      </p>
    </section>
  );
}
