import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import {
  COMPACT_2BED_PATIO,
  L_SHAPE_FAMILY_3BED,
  NARROW_LOT_LINEAR,
  PATIO_CENTRAL,
  WEEKEND_GALLERY_HOUSE,
} from "./architecturalTemplates";
import type { ArchitecturalTemplate, TemplateSelectionResult } from "./types";

const NARROW_LOT_AREA_M2 = 85;
const NARROW_KEYWORDS =
  /\b(angost|estrech|narrow|frente\s*chico|lote\s*angosto|4\s*x\s*20|5\s*x\s*25)\b/i;
const PATIO_CENTRAL_KEYWORDS =
  /\b(patio\s*central|patrio|atio\s*al\s*centro|centro\s*con\s*patio)\b/i;
const WEEKEND_KEYWORDS =
  /\b(weekend|fin\s*de\s*semana|galer[ií]a|parrill|quincho|asado|barbacoa)\b/i;

function textSignals(prefs: UserPreferences | undefined, program: ArchitecturalProgram) {
  const needs = prefs?.basicNeeds ?? "";
  const notes = program.globalConfig.notes ?? "";
  return `${needs} ${notes} ${program.title}`;
}

export function selectArchitecturalTemplate(
  program: ArchitecturalProgram,
  planShape: UserPreferences["planShape"],
  preferences?: UserPreferences,
): TemplateSelectionResult {
  const counts = preferences?.roomCounts;
  const bedrooms =
    counts?.bedrooms ??
    program.programmaticZones.filter((z) => z.type === "private").length;
  const bathrooms =
    counts?.bathrooms ??
    program.programmaticZones.filter(
      (z) =>
        z.type === "service" &&
        /ban|bañ|wc|toilet/i.test(z.id + z.label),
    ).length;
  const wantsPatio =
    (counts?.patio ?? 0) > 0 ||
    program.programmaticZones.some((z) => z.type === "outdoor");
  const areaM2 = preferences?.lotSize.areaM2 ?? program.globalConfig.targetTotalAreaM2;
  const text = textSignals(preferences, program);

  if (WEEKEND_KEYWORDS.test(text)) {
    return {
      template: WEEKEND_GALLERY_HOUSE,
      reason: "Brief menciona fin de semana, galería o parrilla",
    };
  }

  if (PATIO_CENTRAL_KEYWORDS.test(text)) {
    return {
      template: PATIO_CENTRAL,
      reason: "Brief solicita patio central",
    };
  }

  if (
    planShape === "l_shape" &&
    bedrooms >= 3
  ) {
    return {
      template: L_SHAPE_FAMILY_3BED,
      reason: `Forma L con ${bedrooms} dormitorios (familia)`,
    };
  }

  if (
    bedrooms <= 2 &&
    wantsPatio &&
    (planShape === "rectangular" || planShape === "square")
  ) {
    return {
      template: COMPACT_2BED_PATIO,
      reason: `Hasta ${bedrooms} dormitorios con patio en lote ${planShape}`,
    };
  }

  if (
    NARROW_KEYWORDS.test(text) ||
    areaM2 < NARROW_LOT_AREA_M2 ||
    (planShape === "rectangular" && areaM2 < 95)
  ) {
    return {
      template: NARROW_LOT_LINEAR,
      reason: `Lote angosto o superficie compacta (${areaM2} m²)`,
    };
  }

  if (wantsPatio && planShape === "square") {
    return {
      template: PATIO_CENTRAL,
      reason: "Planta cuadrada con patio exterior",
    };
  }

  if (planShape === "l_shape") {
    return {
      template: L_SHAPE_FAMILY_3BED,
      reason: "Forma L — plantilla familiar por defecto",
    };
  }

  if (bedrooms <= 2 && wantsPatio) {
    return {
      template: COMPACT_2BED_PATIO,
      reason: "2 dormitorios o menos con patio",
    };
  }

  return {
    template: COMPACT_2BED_PATIO,
    reason: "Plantilla rectangular compacta por defecto",
  };
}
