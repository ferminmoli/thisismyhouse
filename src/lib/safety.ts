import type { ConceptPlan, SafetyResult } from "./types";

const BANNED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b\d+\s*(m2|m²|sqm|sq\s*ft)\b/i, reason: "dimension units (area)" },
  { pattern: /\b\d+(\.\d+)?\s*(m|cm|ft|feet|meters?|metres?)\b/i, reason: "dimension units" },
  { pattern: /\bsquare\s+meters?\b/i, reason: "square meters" },
  { pattern: /\b(cad|dwg|bim|revit)\b/i, reason: "technical file formats" },
  {
    pattern: /\b(construction[- ]ready|permit[- ]ready|buildable)\b/i,
    reason: "construction-ready claims",
  },
  {
    pattern: /\b(beam|column|foundation|load[- ]bearing)\b/i,
    reason: "structural claims",
  },
  {
    pattern: /\b(code[- ]compliant|legal|approved)\b/i,
    reason: "compliance claims",
  },
];

const INPUT_BLOCK_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\b(medidas?\s+exactas?|dimensiones?\s+exactas?)\b/i,
    reason: "request for exact measurements",
  },
  {
    pattern: /\b(listo\s+para\s+construir|construction[- ]ready|permit[- ]ready)\b/i,
    reason: "request for construction-ready output",
  },
  {
    pattern: /\b(presentar\s+al\s+municipio|permiso\s+de\s+obra)\b/i,
    reason: "request for permit-ready documentation",
  },
  {
    pattern: /\b(plano\s+con\s+medidas|planos?\s+t[eé]cnicos?)\b/i,
    reason: "request for technical plans with dimensions",
  },
  {
    pattern: /\b(estructura\s+detallada|plan\s+estructural)\b/i,
    reason: "request for structural documentation",
  },
];

function collectMatches(text: string, patterns: typeof BANNED_PATTERNS): string[] {
  const reasons: string[] = [];
  for (const { pattern, reason } of patterns) {
    if (pattern.test(text)) {
      reasons.push(reason);
    }
  }
  return reasons;
}

function planToText(plan: ConceptPlan): string {
  const parts = [
    plan.title,
    plan.disclaimer,
    plan.inputSummary,
    plan.explanation,
    ...plan.assumptions,
    ...plan.architectQuestions,
    ...plan.zones.flatMap((z) => [z.label, z.description]),
    ...plan.adjacencies.map((a) => a.reason),
  ];
  return parts.join("\n");
}

export function validateInputSafety(prompt: string): SafetyResult {
  const reasons = collectMatches(prompt, INPUT_BLOCK_PATTERNS);
  if (reasons.length > 0) {
    return { status: "blocked", reasons };
  }
  return { status: "passed", reasons: [] };
}

export function validateOutputSafety(plan: ConceptPlan): SafetyResult {
  const text = planToText(plan);
  const reasons = collectMatches(text, BANNED_PATTERNS);
  if (reasons.length > 0) {
    return { status: "repair_required", reasons };
  }
  return { status: "passed", reasons: [] };
}

export const BLOCKED_MESSAGE =
  "No podemos generar planos técnicos, medidas ni documentación lista para construir o permisos. Este POC solo crea bocetos conceptuales para conversar con un arquitecto.";

export const REQUIRED_DISCLAIMER =
  "This is a conceptual sketch for discussion only. An architect must validate and design the actual project.";
