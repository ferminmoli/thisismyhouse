import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import { findSharedWall } from "@/lib/canvas-renderer/shared-wall-geometry";
import { rectArea } from "@/lib/floorplan-layout/geometry";

export type PlanQualityScores = {
  circulationScore: number;
  lightingScore: number;
  zoningScore: number;
  patioConnectionScore: number;
  compositionScore: number;
  compactnessScore: number;
  realismScore: number;
  /** Promedio ponderado para ranking. */
  compositeScore: number;
};

const MIN_QUALITY = 0.35;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function zoneById(layout: FloorplanLayoutResult) {
  return new Map(layout.zones.map((z) => [z.id, z]));
}

function hasEdge(program: ArchitecturalProgram, a: string, b: string): boolean {
  return program.topologyGraph.some(
    (e) =>
      (e.from === a && e.to === b) || (e.from === b && e.to === a),
  );
}

function sharedExists(
  layout: FloorplanLayoutResult,
  a: string,
  b: string,
): boolean {
  const zones = zoneById(layout);
  const za = zones.get(a);
  const zb = zones.get(b);
  if (!za || !zb) return false;
  return findSharedWall(za, zb) != null;
}

export function scoreFloorplanLayout(
  layout: FloorplanLayoutResult,
  program: ArchitecturalProgram,
): PlanQualityScores {
  const zones = layout.zones;
  const validationOk = layout.templateMeta?.validation.ok !== false;

  const social = zones.filter((z) => z.type === "social");
  const privateZ = zones.filter((z) => z.type === "private");
  const outdoor = zones.filter((z) => z.type === "outdoor");
  const socialArea = social.reduce((s, z) => s + rectArea(z), 0);
  const privateArea = privateZ.reduce((s, z) => s + rectArea(z), 0);
  const totalArea = zones.reduce((s, z) => s + rectArea(z), 0);

  const socialRatio = totalArea > 0 ? socialArea / totalArea : 0;
  const compositionScore = clamp01(
    socialRatio >= 0.22 && socialRatio <= 0.38
      ? 0.85 + (socialRatio - 0.28) * 0.5
      : socialRatio < 0.15
        ? 0.4
        : 0.65,
  );

  const largestPrivate = privateZ.reduce(
    (m, z) => Math.max(m, rectArea(z)),
    0,
  );
  const socialVsBed =
    socialArea > 0 ? largestPrivate / socialArea : 2;
  const zoningScore = clamp01(
    socialVsBed < 0.85 ? 0.9 : socialVsBed < 1.1 ? 0.7 : 0.45,
  );

  let topologyHits = 0;
  let topologyTotal = 0;
  for (const edge of program.topologyGraph) {
    if (edge.strength === "medium") continue;
    topologyTotal++;
    if (sharedExists(layout, edge.from, edge.to)) topologyHits++;
  }
  const circulationScore = clamp01(
    topologyTotal > 0 ? topologyHits / topologyTotal : 0.75,
  );

  let patioScore = 0.5;
  const patioZone = outdoor[0];
  const sala = social.find((z) => /sala|living|comedor/i.test(z.id));
  if (patioZone && sala) {
    const shared = findSharedWall(patioZone, sala);
    patioScore = shared ? 0.95 : hasEdge(program, patioZone.id, sala.id) ? 0.6 : 0.4;
  }

  const lightingScore = clamp01(
    (social.length > 0 ? 0.4 : 0) +
      (privateZ.length > 0 ? 0.35 : 0) +
      (zones.some((z) => z.type === "service") ? 0.15 : 0) +
      (outdoor.length > 0 ? 0.1 : 0),
  );

  const fill = layout.fillRatio;
  const compactnessScore = clamp01(
    fill >= 0.55 && fill <= 0.92 ? 0.8 : fill > 0.95 ? 0.5 : 0.65,
  );

  const unmappedPenalty = (layout.templateMeta?.unmappedRooms.length ?? 0) * 0.08;
  const realismScore = clamp01(
    (validationOk ? 0.85 : 0.45) -
      unmappedPenalty +
      (layout.templateMeta ? 0.1 : 0),
  );

  const patioConnectionScore = clamp01(patioScore);

  const compositeScore =
    circulationScore * 0.18 +
    lightingScore * 0.12 +
    zoningScore * 0.18 +
    patioConnectionScore * 0.15 +
    compositionScore * 0.2 +
    compactnessScore * 0.07 +
    realismScore * 0.1;

  return {
    circulationScore,
    lightingScore,
    zoningScore,
    patioConnectionScore,
    compositionScore,
    compactnessScore,
    realismScore,
    compositeScore: clamp01(compositeScore),
  };
}

export function passesQualityGate(
  scores: PlanQualityScores,
  layout?: FloorplanLayoutResult,
): boolean {
  const validationOk = layout?.templateMeta?.validation?.ok !== false;
  const hasOverlapWarnings = (layout?.warnings ?? []).some((w) =>
    w.startsWith("Solape:"),
  );
  if (!validationOk || hasOverlapWarnings) return false;
  return scores.compositeScore >= MIN_QUALITY && scores.realismScore >= 0.4;
}
