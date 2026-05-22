import type { ArchitecturalProgram, ProgramRoom } from "./architecturalProgram";
import type { GeneratedPlan, RenderZone } from "./generatedPlan";
import {
  enclosureOfZone,
  isOutdoorSpace,
  isSemiOutdoorSpace,
  zoneCanvasArea,
} from "./spaceClassification";

export const NORMALIZED_CANVAS = { width: 100, height: 100 } as const;

export type CoordinateSystem = {
  type: "normalized_canvas";
  canvasWidth: number;
  canvasHeight: number;
  unit: "percent";
  realWorldUnits: false;
  conversionNote: string;
};

export type AreaEstimateConfidence = "low" | "medium" | "high";

export type ZoneAreaKind = "covered" | "semi_covered" | "outdoor";

export type ZoneAreaEstimate = {
  roomId: string;
  type: RenderZone["type"];
  estimatedAreaM2: number;
  areaKind: ZoneAreaKind;
};

export type AreaEstimate = {
  targetCoveredAreaM2: number;
  estimatedCoveredAreaM2: number;
  targetOutdoorAreaM2: number | null;
  estimatedOutdoorAreaM2: number;
  estimatedSemiCoveredAreaM2: number;
  estimatedTotalProgramAreaM2: number;
  coveredCanvasUnits: number;
  outdoorCanvasUnits: number;
  semiCoveredCanvasUnits: number;
  zoneAreaEstimates: ZoneAreaEstimate[];
  confidence: AreaEstimateConfidence;
  method: string;
};

export type PlanSpatialMetadata = {
  coordinateSystem: CoordinateSystem;
  areaEstimate: AreaEstimate;
};

function sumByEnclosure(plan: GeneratedPlan) {
  let covered = 0;
  let outdoor = 0;
  let semi = 0;
  for (const z of plan.zones) {
    const a = zoneCanvasArea(z);
    const enc = enclosureOfZone(z);
    if (enc === "covered") covered += a;
    else if (enc === "outdoor") outdoor += a;
    else semi += a;
  }
  return { covered, outdoor, semi };
}

function roomIdealM2(
  program: ArchitecturalProgram,
  roomId: string,
): number | null {
  const room = program.rooms.find(
    (r) => r.id.trim().toUpperCase() === roomId.trim().toUpperCase(),
  );
  return room?.idealAreaM2 ?? null;
}

function zoneAreaKind(z: RenderZone): ZoneAreaKind {
  const enc = enclosureOfZone(z);
  if (enc === "outdoor") return "outdoor";
  if (enc === "semi_covered") return "semi_covered";
  return "covered";
}

/**
 * Cubierto: escala lineal para que la suma de zonas cubiertas ≈ targetCovered.
 * Exterior: escala independiente usando idealAreaM2 del patio cuando existe.
 */
export function buildAreaEstimate(
  plan: GeneratedPlan,
  program: ArchitecturalProgram,
): AreaEstimate {
  const { covered, outdoor, semi } = sumByEnclosure(plan);
  const targetCovered = program.targetAreaM2 ?? 100;
  const patioIdeal = roomIdealM2(program, "PATIO");
  const targetOutdoor = patioIdeal ?? Math.round(targetCovered * 0.12);

  const coveredScale =
    covered > 0 ? targetCovered / covered : targetCovered / 100;
  const outdoorScale =
    outdoor > 0 ? targetOutdoor / outdoor : targetOutdoor / 100;
  const semiScale = coveredScale * 0.65;

  const zoneAreaEstimates: ZoneAreaEstimate[] = [];
  let estimatedCovered = 0;
  let estimatedOutdoor = 0;
  let estimatedSemi = 0;

  for (const z of plan.zones) {
    const units = zoneCanvasArea(z);
    const kind = zoneAreaKind(z);
    let m2: number;
    if (kind === "outdoor") {
      m2 = Math.round(units * outdoorScale);
      estimatedOutdoor += m2;
    } else if (kind === "semi_covered") {
      m2 = Math.round(units * semiScale);
      estimatedSemi += m2;
    } else {
      m2 = Math.round(units * coveredScale);
      estimatedCovered += m2;
    }
    zoneAreaEstimates.push({
      roomId: z.sourceRoomId,
      type: z.type,
      estimatedAreaM2: m2,
      areaKind: kind,
    });
  }

  if (estimatedCovered > 0 && Math.abs(estimatedCovered - targetCovered) > 2) {
    const adjust = targetCovered / estimatedCovered;
    estimatedCovered = 0;
    for (const z of zoneAreaEstimates) {
      if (z.areaKind !== "covered") continue;
      z.estimatedAreaM2 = Math.round(z.estimatedAreaM2 * adjust);
      estimatedCovered += z.estimatedAreaM2;
    }
  }

  if (
    patioIdeal != null &&
    estimatedOutdoor > 0 &&
    Math.abs(estimatedOutdoor - targetOutdoor) > 2
  ) {
    const adjust = targetOutdoor / estimatedOutdoor;
    estimatedOutdoor = 0;
    for (const z of zoneAreaEstimates) {
      if (z.areaKind !== "outdoor") continue;
      z.estimatedAreaM2 = Math.round(z.estimatedAreaM2 * adjust);
      estimatedOutdoor += z.estimatedAreaM2;
    }
  }

  const estimatedTotalProgramAreaM2 =
    estimatedCovered + estimatedSemi + estimatedOutdoor;

  let confidence: AreaEstimateConfidence = "medium";
  if (!program.targetAreaM2) confidence = "low";

  return {
    targetCoveredAreaM2: targetCovered,
    estimatedCoveredAreaM2: estimatedCovered,
    targetOutdoorAreaM2: patioIdeal,
    estimatedOutdoorAreaM2: estimatedOutdoor,
    estimatedSemiCoveredAreaM2: estimatedSemi,
    estimatedTotalProgramAreaM2,
    coveredCanvasUnits: covered,
    outdoorCanvasUnits: outdoor,
    semiCoveredCanvasUnits: semi,
    zoneAreaEstimates,
    confidence,
    method:
      "Zonas cubiertas escaladas al objetivo de área cubierta. Zonas exteriores usan idealAreaM2 del patio cuando está definido y escala independiente del canvas. No implica medición real de obra.",
  };
}

export function buildCoordinateSystem(): CoordinateSystem {
  return {
    type: "normalized_canvas",
    canvasWidth: NORMALIZED_CANVAS.width,
    canvasHeight: NORMALIZED_CANVAS.height,
    unit: "percent",
    realWorldUnits: false,
    conversionNote:
      "Coordenadas x/y/width/height son porcentaje de un canvas 100×100 conceptual. Consultar areaEstimate para m² aproximados.",
  };
}

export function buildPlanSpatialMetadata(
  plan: GeneratedPlan,
  program: ArchitecturalProgram,
): PlanSpatialMetadata {
  return {
    coordinateSystem: buildCoordinateSystem(),
    areaEstimate: buildAreaEstimate(plan, program),
  };
}

export function enrichPlanSpatialMetadata(
  plan: GeneratedPlan,
  program: ArchitecturalProgram,
): GeneratedPlan {
  const spatial = buildPlanSpatialMetadata(plan, program);
  return {
    ...plan,
    metadata: {
      ...plan.metadata,
      coordinateSystem: spatial.coordinateSystem,
      areaEstimate: spatial.areaEstimate,
      notes: [
        ...plan.metadata.notes.filter((n) => !n.startsWith("Scale:")),
        `Scale: ${spatial.coordinateSystem.conversionNote}`,
      ],
    },
  };
}

export function patioMiscountedAsCovered(plan: GeneratedPlan): boolean {
  return plan.zones.some(
    (z) => isOutdoorSpace(z.type) && z.notes?.includes("covered"),
  );
}

export function galleryModeledAsFurniture(plan: GeneratedPlan): boolean {
  return plan.furniture.some(
    (f) =>
      f.id.includes("gallery") ||
      (f.zoneId === "PATIO" && f.height <= 6 && f.width >= 15),
  );
}

export function hasSemiOutdoorGalleryZone(plan: GeneratedPlan): boolean {
  return plan.zones.some(
    (z) =>
      isSemiOutdoorSpace(z.type) &&
      /GALERIA|GALERÍA/i.test(z.sourceRoomId),
  );
}

export function hasLaundryZone(plan: GeneratedPlan): boolean {
  return plan.zones.some((z) => /LAVADERO|LAVANDER/i.test(z.sourceRoomId));
}

export function hasLaundryVentilation(plan: GeneratedPlan): boolean {
  const hasZone = hasLaundryZone(plan);
  if (!hasZone) return false;
  return plan.windows.some((w) => /LAVADERO|LAVANDER/i.test(w.zoneId));
}

/** Máxima distancia Manhattan entre orígenes de zonas de servicio húmedo. */
export function wetRoomsMaxOriginDistance(plan: GeneratedPlan): number {
  const wet = plan.zones.filter((z) =>
    /COCINA|BANIO|BAÑO|LAVADERO|LAVANDER/i.test(z.sourceRoomId),
  );
  let maxD = 0;
  for (let i = 0; i < wet.length; i++) {
    for (let j = i + 1; j < wet.length; j++) {
      const a = wet[i]!;
      const b = wet[j]!;
      maxD = Math.max(
        maxD,
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      );
    }
  }
  return maxD;
}
