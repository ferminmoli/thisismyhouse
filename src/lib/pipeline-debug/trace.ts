import type {
  PipelineDebugStep,
  PipelineDebugTrace,
  PipelineStepStatus,
} from "./types";

export function isPipelineDebugEnabled(): boolean {
  if (process.env.PIPELINE_DEBUG === "true") return true;
  if (process.env.NEXT_PUBLIC_PIPELINE_DEBUG === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function createPipelineTrace(): {
  trace: PipelineDebugTrace;
  push: (
    step: Omit<PipelineDebugStep, "status"> & { status?: PipelineStepStatus },
  ) => void;
  finish: () => PipelineDebugTrace;
} {
  const trace: PipelineDebugTrace = {
    steps: [],
    startedAt: new Date().toISOString(),
  };

  const push = (
    step: Omit<PipelineDebugStep, "status"> & { status?: PipelineStepStatus },
  ) => {
    trace.steps.push({
      status: "ok",
      ...step,
    });
  };

  const finish = () => {
    trace.finishedAt = new Date().toISOString();
    if (isPipelineDebugEnabled()) {
      printPipelineDebug(trace);
    }
    return trace;
  };

  return { trace, push, finish };
}

/** Resumen legible en consola del servidor o del browser. */
export function printPipelineDebug(trace: PipelineDebugTrace): void {
  const header = "═══ PIPELINE DEBUG ═══";
  console.group(header);
  console.log(`started: ${trace.startedAt}`);
  for (const s of trace.steps) {
    const icon =
      s.status === "ok"
        ? "✓"
        : s.status === "warn"
          ? "⚠"
          : s.status === "error"
            ? "✗"
            : "○";
    const dur = s.durationMs != null ? ` (${s.durationMs}ms)` : "";
    console.groupCollapsed(`${icon} [${s.phase}] ${s.id}: ${s.label}${dur}`);
    if (s.messages?.length) console.warn("messages:", s.messages);
    console.log("output:", s.output);
    console.groupEnd();
  }
  if (trace.finishedAt) console.log(`finished: ${trace.finishedAt}`);
  console.groupEnd();
}

export function mergeTraces(
  ...traces: (PipelineDebugTrace | undefined)[]
): PipelineDebugTrace {
  const steps = traces.flatMap((t) => t?.steps ?? []);
  const startedAt =
    traces.find((t) => t?.startedAt)?.startedAt ?? new Date().toISOString();
  const finishedAt = traces.find((t) => t?.finishedAt)?.finishedAt;
  return { steps, startedAt, finishedAt };
}
