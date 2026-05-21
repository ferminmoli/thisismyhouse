export type PipelineStepStatus = "ok" | "warn" | "error" | "skip";

export type PipelineDebugPhase =
  | "onboarding"
  | "api"
  | "llm"
  | "validate"
  | "layout"
  | "client";

export type PipelineDebugStep = {
  id: string;
  phase: PipelineDebugPhase;
  label: string;
  status: PipelineStepStatus;
  durationMs?: number;
  output: Record<string, unknown>;
  messages?: string[];
};

export type PipelineDebugTrace = {
  steps: PipelineDebugStep[];
  startedAt: string;
  finishedAt?: string;
};
