import type {
  FloorPlanDebug,
  PublicFloorPlanResult,
  PublicFloorPlanVariant,
  PublicPlanGeometry,
} from "@/lib/architecture/floorPlanPipelineTypes";

const MOCK_PLAN: PublicPlanGeometry = {
  id: "plan_mock",
  title: "Casa familiar compacta en L",
  templateId: "l_shape_patio",
  variantLabel: "Base",
  zones: [
    {
      id: "zone_SALA",
      label: "Sala / comedor",
      type: "social",
      x: 20,
      y: 52,
      width: 38,
      height: 28,
      estimatedAreaM2: 32,
      areaKind: "covered",
    },
    {
      id: "zone_PATIO",
      label: "Patio",
      type: "outdoor",
      x: 20,
      y: 80,
      width: 56,
      height: 16,
      estimatedAreaM2: 10,
      areaKind: "outdoor",
    },
  ],
  doors: [
    {
      id: "d1",
      from: "SALA_COMEDOR",
      to: "PATIO",
      type: "sliding",
      wall: "bottom",
      position: 50,
      width: 8,
    },
  ],
  windows: [],
  furniture: [],
  areaEstimate: {
    coveredM2: 100,
    outdoorM2: 10,
    semiCoveredM2: 0,
    totalM2: 110,
    confidence: "medium",
  },
};

function variant(
  id: string,
  label: string,
  rank: number,
  highlights: string[],
): PublicFloorPlanVariant {
  return {
    id,
    label,
    description: highlights[0] ?? label,
    rank,
    score: 90 - rank * 3,
    plan: { ...MOCK_PLAN, id: `plan_${id}`, variantLabel: label },
    highlights,
  };
}

const REC = variant(
  "add_laundry_as_kitchen_extension",
  "Lavadero en extensión de cocina",
  1,
  ["Completa el programa familiar con área de servicio ventilada."],
);

export const MOCK_PUBLIC_RESULT: PublicFloorPlanResult = {
  title: "Casa familiar compacta en L",
  recommendedVariant: REC,
  topVariants: [
    REC,
    variant("expand_patio", "Patio protagonista", 2, [
      "Refuerza la conexión social-exterior.",
    ]),
    variant("integrate_kitchen", "Cocina más integrada", 3, [
      "Mejor integración cocina–living.",
    ]),
  ],
  whyRecommended: [
    "Mantiene living/comedor conectado al patio.",
    "Agrega lavadero sin romper el núcleo de cocina.",
    "Conserva el ala privada de dormitorios.",
  ],
  confidence: {
    level: "medium_low",
    reasons: [
      "La geometría conceptual cumple las relaciones principales.",
      "La orientación del lote todavía no fue informada.",
      "Las medidas reales del terreno no fueron validadas.",
      "Debe revisarse normativa y factibilidad constructiva.",
    ],
  },
  professionalReview: {
    required: true,
    items: ["Orientación solar", "Medidas del lote", "Estructura"],
  },
  architectBrief: {
    summary:
      "Una distribución compacta en L que prioriza el vínculo entre cocina, estar-comedor y patio, incorporando lavadero ventilado como extensión del núcleo húmedo.",
    keyDecisions: ["Parti en L con patio social.", "Lavadero adosado a cocina."],
    areas: { coveredM2: 100, outdoorM2: 10, totalM2: 110 },
    rooms: [
      {
        id: "SALA_COMEDOR",
        label: "Sala / comedor",
        type: "social",
        estimatedAreaM2: 32,
        areaKind: "covered",
      },
      { id: "PATIO", label: "Patio", type: "outdoor", estimatedAreaM2: 10, areaKind: "outdoor" },
    ],
    warnings: ["La orientación solar del lote aún no está definida."],
    nextSteps: ["Confirmar orientación del lote."],
  },
  visualInspiration: {
    prompt: "Casa familiar moderna con patio y luz natural cálida.",
    notes: ["Solo referencia estética."],
  },
  disclaimer:
    "Esta es una propuesta de layout conceptual, no un plano de obra listo para construir.",
};

export const MOCK_DEBUG_PAYLOAD: FloorPlanDebug = {
  requestId: "test-req",
  stages: [{ id: "plan_scorer", status: "ok", durationMs: 12 }],
  scoredVariants: [
    {
      mutationType: "add_laundry_as_kitchen_extension",
      rank: 1,
      score: { total: 97, penalties: { warnings: 0 } },
    },
  ],
  selectionMethod: {
    rawTopVariant: "add_laundry_as_kitchen_extension",
    finalRecommendedVariant: "add_laundry_as_kitchen_extension",
    nearTieApplied: false,
    nearTieThreshold: 2,
    reason: "Score",
  },
  warnings: [],
  architecturalIssues: [],
};
