import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan } from "./generatedPlan";
import { hasLaundryZone, hasSemiOutdoorGalleryZone } from "./planMetadata";
import type { ScoredPlanVariant } from "./planScorer";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { ArchitectBrief } from "./floorPlanPipelineTypes";
import { detectPromptLanguage } from "./prioritySelection";
import type { RecommendationConfidence } from "./recommendationEngine";

const PROFESSIONAL_CHECKS_ES = [
  "Orientación solar real y asoleamiento por estación",
  "Medidas reales del lote y retiros normativos",
  "Normativa municipal y código de edificación local",
  "Estructura, losas y muros portantes",
  "Instalaciones: plomería, gas, electricidad",
  "Ventilación natural e iluminación verificada in situ",
  "Superficie cubierta vs semi-cubierta vs exterior",
];

const PROFESSIONAL_CHECKS_EN = [
  "Real solar orientation and seasonal sun exposure",
  "Actual lot dimensions and zoning setbacks",
  "Local building code and municipal regulations",
  "Structure, slabs, and load-bearing walls",
  "Plumbing, gas, and electrical systems",
  "Natural ventilation and daylight on site",
  "Covered vs semi-covered vs outdoor area classification",
];

export type ArchitectBriefParams = {
  program: ArchitecturalProgram;
  strategy: ArchitecturalStrategy;
  recommended: ScoredPlanVariant;
  topVariants: ScoredPlanVariant[];
  userPrompt: string;
  confidence: RecommendationConfidence;
};

export function generateArchitectBrief(
  params: ArchitectBriefParams,
): ArchitectBrief {
  const lang = detectPromptLanguage(params.userPrompt);
  const { program, strategy, recommended } = params;
  const plan = recommended.plan;
  const est = plan.metadata.areaEstimate;
  const hasGallery = hasSemiOutdoorGalleryZone(plan);
  const hasLaundry = hasLaundryZone(plan);

  const roomLabels = program.rooms.map(
    (r) => `${r.label} (${r.id})`,
  );

  const keyAdjacencies = program.hardAdjacencies
    .filter((a) => a.strength === "hard")
    .slice(0, 8)
    .map((a) => `${a.from} ↔ ${a.to}: ${a.reason}`);

  const strategyHeadline =
    strategy.reasons[0] ?? `Parti preferido: ${strategy.preferredParti}`;
  const spatialStrategy =
    lang === "es"
      ? [`Parti: ${strategy.preferredParti} — ${strategyHeadline}`, ...strategy.reasons.slice(0, 4)]
      : [`Parti: ${strategy.preferredParti} — ${strategyHeadline}`, ...strategy.reasons.slice(0, 4)];

  if (program.site.lotShape === "narrow") {
    spatialStrategy.push(
      lang === "es"
        ? "Lote angosto: mantener franjas longitudinales y evitar volúmenes excesivamente anchos."
        : "Narrow lot: favor longitudinal bands and avoid excessively wide footprints.",
    );
  }

  const serviceCoreNotes: string[] = [];
  if (hasLaundry) {
    serviceCoreNotes.push(
      lang === "es"
        ? "Lavadero de servicio adosado a cocina; validar ventilación, desagües y ubicación de artefactos."
        : "Service laundry attached to kitchen; validate ventilation, drains, and fixture layout.",
    );
  } else if (program.rooms.length >= 4) {
    serviceCoreNotes.push(
      lang === "es"
        ? "Sin lavadero modelado: evaluar si el programa familiar lo requiere antes de obra."
        : "No laundry modeled: assess whether the family program requires it before construction.",
    );
  }
  serviceCoreNotes.push(
    lang === "es"
      ? "Núcleo húmedo (cocina, baño, eventual lavadero) debe revisarse con plomero/gasista."
      : "Wet core (kitchen, bath, optional laundry) needs plumbing/gas professional review.",
  );

  const daylightNotes: string[] = [];
  if (program.site.orientation === "unknown") {
    daylightNotes.push(
      lang === "es"
        ? "Orientación no definida: la luz natural mostrada es heurística, no garantía solar."
        : "Orientation undefined: daylight shown is heuristic, not guaranteed solar performance.",
    );
  }
  daylightNotes.push(
    lang === "es"
      ? "Prioridad del brief en luz natural y conexión social-exterior."
      : "Brief prioritizes daylight and social-outdoor connection.",
  );
  if (hasGallery) {
    daylightNotes.push(
      lang === "es"
        ? "Galería / transición semi-cubierta entre social y patio: validar sombras y lluvia."
        : "Gallery / semi-covered transition between social and patio: validate shade and rain.",
    );
  }

  const unresolved = [
    ...program.architectQuestions.slice(0, 5),
    ...(program.site.accessSide === "unknown"
      ? [
          lang === "es"
            ? "Acceso desde calle no especificado."
            : "Street access side not specified.",
        ]
      : []),
  ];

  const recommendedConcept =
    lang === "es"
      ? `Variante recomendada: «${recommended.label}». ${recommended.description} Puntaje conceptual más alto del set evaluado.`
      : `Recommended variant: "${recommended.label}". ${recommended.description} Highest conceptual score in the evaluated set.`;

  const projectSummary =
    lang === "es"
      ? `${program.title}. ${program.inputSummary} Superficie objetivo aproximada ${program.targetAreaM2 ?? "—"} m² cubiertos. Planta ${program.floorCount}.`
      : `${program.title}. ${program.inputSummary} Target covered area ~${program.targetAreaM2 ?? "—"} m². ${program.floorCount} floor(s).`;

  return {
    projectSummary,
    recommendedConcept,
    program: {
      coveredAreaTargetM2: program.targetAreaM2,
      outdoorAreaTargetM2: est?.targetOutdoorAreaM2 ?? undefined,
      rooms: roomLabels,
    },
    spatialStrategy,
    keyAdjacencies,
    serviceCoreNotes,
    daylightAndVentilationNotes: daylightNotes,
    unresolvedQuestions: unresolved,
    professionalValidationRequired:
      lang === "es" ? PROFESSIONAL_CHECKS_ES : PROFESSIONAL_CHECKS_EN,
  };
}
