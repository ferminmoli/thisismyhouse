export type ZoneType =
  | "social"
  | "private"
  | "service"
  | "outdoor"
  | "work"
  | "flex";

export type RelativeSize = "small" | "medium" | "large";

/** Legacy concept sketch (SVG); el flujo activo usa ArchitecturalProgram + FloorplanLayoutResult. */
export type ConceptPlan = {
  title: string;
  disclaimer: string;
  inputSummary: string;
  assumptions: string[];
  zones: Array<{
    id: string;
    label: string;
    type: ZoneType;
    description: string;
    relativeSize: RelativeSize;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  adjacencies: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
  explanation: string;
  architectQuestions: string[];
};

export type SafetyStatus = "passed" | "repair_required" | "blocked";

export type SafetyResult = {
  status: SafetyStatus;
  reasons: string[];
};
