export type AreaUnit = "m2" | "sqft";

export type PlanShape = "rectangular" | "square" | "l_shape";

export type FloorCount = 1 | 2;

/** Conteo estructurado tipo Maket (habitaciones, baños, etc.). */
export type RoomCounts = {
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  living: number;
  patio: number;
  garage: number;
};

/** Objeto consolidado listo para backend / LLM. */
export type UserPreferences = {
  basicNeeds: string;
  roomCounts: RoomCounts;
  floorCount: FloorCount;
  lotSize: {
    value: number;
    unit: AreaUnit;
    /** Valor normalizado a m² para el motor y prompts. */
    areaM2: number;
    /** El usuario ingresó sqft < 30; interpretamos el número como m². */
    assumedM2FromSqft?: boolean;
  };
  planShape: PlanShape;
  completedAt: string;
};

const SQFT_TO_M2 = 0.092903;

export const SQFT_ASSUME_M2_THRESHOLD = 30;

export const SQFT_ASSUME_M2_MESSAGE =
  "Asumimos m² para que las dimensiones sean habitables.";

/** Valores iniciales del onboarding para pruebas rápidas (cache L 100 m²). */
export const DEFAULT_ROOM_COUNTS: RoomCounts = {
  bedrooms: 3,
  bathrooms: 1,
  kitchens: 1,
  living: 1,
  patio: 1,
  garage: 0,
};

export const ONBOARDING_QUICK_TEST_DEFAULTS = {
  basicNeeds: "casa familiar compacta con buena luz en living",
  roomCounts: DEFAULT_ROOM_COUNTS,
  floorCount: 1 as FloorCount,
  lotValue: "100",
  lotUnit: "m2" as AreaUnit,
  planShape: "l_shape" as PlanShape,
};

export function formatRoomCountsForPrompt(counts: RoomCounts): string {
  const parts: string[] = [];
  if (counts.bedrooms > 0) {
    parts.push(
      `${counts.bedrooms} dormitorio${counts.bedrooms > 1 ? "s" : ""}`,
    );
  }
  if (counts.bathrooms > 0) {
    parts.push(
      `${counts.bathrooms} baño${counts.bathrooms > 1 ? "s" : ""}`,
    );
  }
  if (counts.kitchens > 0) {
    parts.push(`${counts.kitchens} cocina`);
  }
  if (counts.living > 0) {
    parts.push("living / comedor");
  }
  if (counts.patio > 0) parts.push("patio o exterior");
  if (counts.garage > 0) {
    parts.push(`${counts.garage} cochera${counts.garage > 1 ? "s" : ""}`);
  }
  return parts.join(", ");
}

export function toAreaM2(value: number, unit: AreaUnit): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === "m2" ? value : value * SQFT_TO_M2;
}

/** sqft con valor &lt; 30 → el usuario probablemente quiso m². */
export function shouldAssumeM2FromSqft(
  value: number,
  unit: AreaUnit,
): boolean {
  return unit === "sqft" && Number.isFinite(value) && value > 0 && value < SQFT_ASSUME_M2_THRESHOLD;
}

export function resolveAreaForBackend(
  value: number,
  unit: AreaUnit,
): { areaM2: number; unitUsed: AreaUnit; assumedM2FromSqft: boolean } {
  if (shouldAssumeM2FromSqft(value, unit)) {
    return { areaM2: value, unitUsed: "m2", assumedM2FromSqft: true };
  }
  return {
    areaM2: toAreaM2(value, unit),
    unitUsed: unit,
    assumedM2FromSqft: false,
  };
}

const SHAPE_LABELS: Record<PlanShape, string> = {
  rectangular: "rectangular",
  square: "cuadrada",
  l_shape: "en L",
};

export function buildPromptFromPreferences(prefs: UserPreferences): string {
  const shape = SHAPE_LABELS[prefs.planShape];
  const floors = prefs.floorCount === 1 ? "una planta" : "dos plantas";
  const area = Math.round(prefs.lotSize.areaM2);

  return [
    prefs.basicNeeds.trim(),
    `Ambientes requeridos: ${formatRoomCountsForPrompt(prefs.roomCounts)}.`,
    `Superficie objetivo aproximada: ${area} m².`,
    `Distribución en ${floors}, forma general ${shape}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function createUserPreferences(input: {
  basicNeeds: string;
  roomCounts: RoomCounts;
  floorCount: FloorCount;
  lotValue: number;
  lotUnit: AreaUnit;
  planShape: PlanShape;
}): UserPreferences {
  const resolved = resolveAreaForBackend(input.lotValue, input.lotUnit);

  return {
    basicNeeds: input.basicNeeds.trim(),
    roomCounts: { ...input.roomCounts },
    floorCount: input.floorCount,
    lotSize: {
      value: input.lotValue,
      unit: resolved.unitUsed,
      areaM2: resolved.areaM2,
      ...(resolved.assumedM2FromSqft
        ? { assumedM2FromSqft: true }
        : {}),
    },
    planShape: input.planShape,
    completedAt: new Date().toISOString(),
  };
}
