import { structuredBriefFromPreferences } from "@/lib/ai-prompts/types";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { parseArchitecturalProgram } from "./schema";
import type {
  ArchitecturalProgram,
  ProgrammaticZone,
  TopologyEdge,
} from "./types";
import { DEFAULT_ALLOWANCE_FACTOR } from "./types";

type ZoneDraft = Omit<ProgrammaticZone, "idealAreaM2" | "minAreaM2"> & {
  areaShare: number;
  minShare?: number;
};

function bedroomZones(count: number): ZoneDraft[] {
  const zones: ZoneDraft[] = [];
  for (let i = 1; i <= count; i++) {
    const isMain = i === 1;
    zones.push({
      id: isMain && count === 1 ? "DORMITORIO_PRINCIPAL" : `DORMITORIO_${i}`,
      label: isMain ? "Dormitorio principal" : `Dormitorio ${i}`,
      type: "private",
      priority: 1,
      areaShare: isMain ? 0.14 : 0.1,
      minShare: isMain ? 0.11 : 0.08,
      aspectRatioRange: [1, 1.4],
      exteriorAnchor: isMain ? "back" : "any",
    });
  }
  return zones;
}

function buildZoneDrafts(prefs: UserPreferences): ZoneDraft[] {
  const rc = prefs.roomCounts;
  const drafts: ZoneDraft[] = [
    {
      id: "ACCESO",
      label: "Acceso",
      type: "circulation",
      priority: 1,
      areaShare: 0.04,
      minShare: 0.03,
      aspectRatioRange: [1.5, 4],
      exteriorAnchor: "front",
    },
  ];

  if (rc.living > 0) {
    drafts.push({
      id: "SALA_COMEDOR",
      label: "Sala / comedor",
      type: "social",
      priority: 1,
      areaShare: prefs.planShape === "l_shape" ? 0.24 : 0.28,
      minShare: 0.18,
      aspectRatioRange: [1.2, 2],
      exteriorAnchor: "front",
    });
  }

  for (let k = 0; k < rc.kitchens; k++) {
    drafts.push({
      id: rc.kitchens > 1 ? `COCINA_${k + 1}` : "COCINA",
      label: rc.kitchens > 1 ? `Cocina ${k + 1}` : "Cocina",
      type: "service",
      priority: 1,
      areaShare: 0.11,
      minShare: 0.07,
      aspectRatioRange: [1.2, 1.8],
      exteriorAnchor: "any",
    });
  }

  drafts.push(...bedroomZones(rc.bedrooms));

  for (let b = 0; b < rc.bathrooms; b++) {
    drafts.push({
      id: rc.bathrooms > 1 ? `BANO_${b + 1}` : "BANIO_PRINCIPAL",
      label: rc.bathrooms > 1 ? `Baño ${b + 1}` : "Baño principal",
      type: "service",
      priority: 1,
      areaShare: 0.05,
      minShare: 0.04,
      aspectRatioRange: [1, 1.6],
      exteriorAnchor: "any",
    });
  }

  if (drafts.length >= 4) {
    drafts.push({
      id: "DISTRIBUIDOR",
      label: "Distribuidor",
      type: "circulation",
      priority: 2,
      areaShare: 0.07,
      minShare: 0.05,
      aspectRatioRange: [1.5, 4],
      exteriorAnchor: "none",
    });
  }

  for (let p = 0; p < rc.patio; p++) {
    drafts.push({
      id: rc.patio > 1 ? `PATIO_${p + 1}` : "PATIO_INTERIOR",
      label: rc.patio > 1 ? `Patio ${p + 1}` : "Patio interior",
      type: "outdoor",
      priority: 2,
      areaShare: 0.1,
      minShare: 0.08,
      aspectRatioRange: [1, 1.8],
      exteriorAnchor: prefs.planShape === "l_shape" ? "back" : "back",
    });
  }

  for (let g = 0; g < rc.garage; g++) {
    drafts.push({
      id: rc.garage > 1 ? `COCHERA_${g + 1}` : "COCHERA",
      label: rc.garage > 1 ? `Cochera ${g + 1}` : "Cochera",
      type: "service",
      priority: 2,
      areaShare: 0.14,
      minShare: 0.1,
      aspectRatioRange: [1.2, 2.5],
      exteriorAnchor: "front",
    });
  }

  const totalShare = drafts.reduce((s, z) => s + z.areaShare, 0);
  return drafts.map((z) => ({
    ...z,
    areaShare: z.areaShare / totalShare,
  }));
}

function allocateAreas(
  drafts: ZoneDraft[],
  targetM2: number,
): ProgrammaticZone[] {
  const programTarget = targetM2 * 0.92;
  return drafts.map((d) => {
    const idealAreaM2 =
      Math.round(d.areaShare * programTarget * 10) / 10;
    const minAreaM2 = d.minShare
      ? Math.round(d.minShare * programTarget * 10) / 10
      : Math.round(idealAreaM2 * 0.85 * 10) / 10;
    const { areaShare: _a, minShare: _m, ...zone } = d;
    return { ...zone, idealAreaM2, minAreaM2 };
  });
}

function buildTopology(
  zones: ProgrammaticZone[],
  prefs: UserPreferences,
): TopologyEdge[] {
  const ids = new Set(zones.map((z) => z.id));
  const has = (id: string) => ids.has(id);
  const edge = (
    from: string,
    to: string,
    relation: TopologyEdge["relation"],
    strength: TopologyEdge["strength"],
    reason: string,
  ): TopologyEdge | null =>
    has(from) && has(to)
      ? { from, to, relation, strength, reason }
      : null;

  const edges: (TopologyEdge | null)[] = [
    edge(
      "ACCESO",
      "SALA_COMEDOR",
      "direct_access",
      "critical",
      "Ingreso directo al área social",
    ),
    edge(
      "SALA_COMEDOR",
      "COCINA",
      "open_concept",
      "strong",
      "Cocina integrada al living",
    ),
    edge(
      "SALA_COMEDOR",
      "DISTRIBUIDOR",
      "transition_door",
      "strong",
      "Transición hacia zona íntima",
    ),
    edge(
      "DISTRIBUIDOR",
      "BANIO_PRINCIPAL",
      "service_door",
      "critical",
      "Baño accesible desde circulación",
    ),
    edge(
      "SALA_COMEDOR",
      "PATIO_INTERIOR",
      "visual_and_physical",
      "strong",
      "Living abierto al patio",
    ),
    edge(
      "COCINA",
      "PATIO_INTERIOR",
      "service_flow",
      "medium",
      "Salida de servicio al exterior",
    ),
    edge(
      "ACCESO",
      "COCHERA",
      "near",
      "soft",
      "Cochera cerca del acceso",
    ),
  ];

  const bedrooms = zones.filter((z) => z.type === "private");
  for (const bed of bedrooms) {
    edges.push(
      edge(
        "DISTRIBUIDOR",
        bed.id,
        "private_door",
        "critical",
        "Dormitorio con acceso íntimo",
      ),
    );
  }

  for (let i = 0; i < bedrooms.length; i++) {
    for (let j = i + 1; j < bedrooms.length; j++) {
      edges.push(
        edge(
          bedrooms[i].id,
          bedrooms[j].id,
          "avoid_direct",
          "soft",
          "Evitar puerta directa entre dormitorios",
        ),
      );
    }
  }

  if (prefs.roomCounts.bathrooms > 1 && has("BANO_2")) {
    edges.push(
      edge(
        "DISTRIBUIDOR",
        "BANO_2",
        "service_door",
        "medium",
        "Segundo baño desde circulación",
      ),
    );
  }

  return edges.filter((e): e is TopologyEdge => e != null);
}

function qualityWeightsFromPrefs(prefs: UserPreferences) {
  const b = structuredBriefFromPreferences(prefs);
  const outdoor = b.lifestyle.outdoorPriority;
  const privacy = b.lifestyle.privacyPriority;
  return {
    circulation: 0.14,
    privacy: Math.min(0.22, 0.12 + privacy * 0.02),
    light: Math.min(0.18, 0.1 + b.preferences.naturalLightPriority * 0.015),
    ventilation: Math.min(0.14, 0.08 + b.preferences.ventilationPriority * 0.012),
    patioConnection: outdoor >= 4 ? 0.18 : outdoor >= 3 ? 0.12 : 0.06,
    wetCoreEfficiency: 0.1,
    briefFit: 0.12,
  };
}

function wetZoneElements(zones: ProgrammaticZone[]): string[] {
  return zones
    .filter((z) => z.type === "service")
    .map((z) => z.id)
    .slice(0, 4);
}

/**
 * Programa arquitectónico local (Prompt 2 sin Gemini).
 * Respeta roomCounts, forma L y schema vigente (qualityWeights, minAreaM2, soft).
 */
export function buildLocalArchitecturalProgram(
  prefs: UserPreferences,
): ArchitecturalProgram {
  const targetM2 = Math.round(prefs.lotSize.areaM2 * 10) / 10;
  const drafts = buildZoneDrafts(prefs);
  const programmaticZones = allocateAreas(drafts, targetM2);
  const topologyGraph = buildTopology(programmaticZones, prefs);
  const wet = wetZoneElements(programmaticZones);

  const shapeLabel =
    prefs.planShape === "l_shape"
      ? "en L"
      : prefs.planShape === "square"
        ? "cuadrada"
        : "rectangular";

  const raw = {
    title: `Programa conceptual — vivienda ${shapeLabel}`,
    globalConfig: {
      targetTotalAreaM2: targetM2,
      allowanceFactor: DEFAULT_ALLOWANCE_FACTOR,
      areaStrategy:
        targetM2 < 90 ? "compact" : targetM2 > 130 ? "generous" : "balanced",
      notes: `Generado localmente (sin Gemini). ${prefs.roomCounts.bedrooms} dorm · ${prefs.roomCounts.bathrooms} baño(s) · ${shapeLabel}.`,
    },
    programmaticZones,
    topologyGraph,
    architecturalRules:
      wet.length >= 2
        ? { wetZonesClustering: [{ group: "wet_block_01", elements: wet }] }
        : undefined,
    qualityWeights: qualityWeightsFromPrefs(prefs),
    assumptions: [
      "Distribución conceptual para explorar opciones, no plano de obra.",
      prefs.lotSize.assumedM2FromSqft
        ? "Superficie interpretada como m²."
        : `Superficie objetivo ${targetM2} m².`,
    ],
    openQuestions: structuredBriefFromPreferences(prefs).openQuestions.length
      ? structuredBriefFromPreferences(prefs).openQuestions
      : [
          "¿La orientación solar del lote confirma living al frente?",
          "¿El patio debe ser más amplio que el living?",
        ],
  };

  const parsed = parseArchitecturalProgram(raw);
  if (!parsed.success) {
    throw new Error(`Local program invalid: ${parsed.error}`);
  }
  return parsed.data;
}

/** Alias para compatibilidad (debug / APIs). */
export function localProgramToJson(prefs: UserPreferences): string {
  return JSON.stringify(buildLocalArchitecturalProgram(prefs), null, 2);
}
