import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type { PlanShape } from "@/lib/onboarding/user-preferences";
import { geminiProgramToConstraint } from "@/lib/layout-engine/adapters/gemini-program-adapter";
import { ConstraintLayoutEngine } from "@/lib/layout-engine/ConstraintLayoutEngine";
import type { PlacedZone } from "@/lib/layout-engine/types";
import type { ZoneType } from "@/lib/types";
import { getLotContainer } from "./lot-container";
import type { FloorplanLayoutResult, PlacedZoneRect } from "./types";

const CONSTRAINT_LOT = 100;

function mapZoneType(type: ZoneType): ProgramZoneType {
  switch (type) {
    case "social":
      return "social";
    case "private":
      return "private";
    case "service":
      return "service";
    case "outdoor":
      return "outdoor";
    default:
      return "circulation";
  }
}

function scalePlacedZone(
  z: PlacedZone,
  scaleX: number,
  scaleY: number,
): PlacedZoneRect {
  return {
    id: z.id,
    label: z.label,
    type: mapZoneType(z.type),
    x: z.x * scaleX,
    y: z.y * scaleY,
    width: z.w * scaleX,
    height: z.h * scaleY,
  };
}

export type ConstraintLayoutOptions = {
  /** Semilla para orden del treemap / relajación (variantes). */
  layoutSeed?: number;
};

/**
 * Programa + motor constraint (adyacencias) → rectángulos px para Canvas unificado.
 * Usado para rectangular y square.
 */
export function computeConstraintFloorplanLayout(
  program: ArchitecturalProgram,
  planShape: PlanShape,
  options: ConstraintLayoutOptions = {},
): FloorplanLayoutResult {
  const container = getLotContainer(planShape);
  const input = geminiProgramToConstraint(program);
  const engine = new ConstraintLayoutEngine(input, {
    treemapSeed: options.layoutSeed,
    relaxationSeed: options.layoutSeed,
  });
  const result = engine.solve();

  const scaleX = container.width / CONSTRAINT_LOT;
  const scaleY = container.height / CONSTRAINT_LOT;

  const zones = result.zones.map((z) => scalePlacedZone(z, scaleX, scaleY));
  const totalPx = container.width * container.height;
  const sumPx = zones.reduce((s, z) => s + z.width * z.height, 0);

  return {
    zones,
    container,
    warnings: [
      ...result.warnings,
      `Motor: constraint (treemap+relajación), adyacencias ${result.metrics.adjacencySatisfied}/${result.metrics.adjacencyTotal}`,
    ],
    fillRatio: totalPx > 0 ? sumPx / totalPx : 0,
    pxPerMeter: undefined,
  };
}
