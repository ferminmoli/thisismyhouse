import { resolveAspectRange } from "./defaults";
import { clampRectToLot, snapRect } from "./geometry";
import { generateDoorsFromAdjacencies } from "./auto-doors";
import { relaxLayout, countAspectViolations } from "./relaxation";
import { collectSharedWalls } from "./shared-walls";
import { seededShuffle } from "@/lib/floorplan-layout/seeded-rng";
import { squarifiedTreemap } from "./squarified-treemap";
import type {
  ConstraintPlanInput,
  ConstraintZoneSpec,
  LayoutEngineOptions,
  LayoutEngineResult,
  PlacedZone,
} from "./types";

/**
 * Constraint-based floorplanning engine.
 *
 * Pipeline:
 * 1. Normalize ideal areas to fill the lot exactly (squarified treemap seed).
 * 2. Force-directed relaxation for adjacency + zero overlap.
 * 3. Aspect-ratio enforcement per zone.
 * 4. Auto door placement on satisfied shared walls.
 */
export class ConstraintLayoutEngine {
  private readonly input: ConstraintPlanInput;
  private readonly options: LayoutEngineOptions & {
    relaxationIterations: number;
    grid: number;
  };

  constructor(
    input: ConstraintPlanInput,
    options: LayoutEngineOptions = {},
  ) {
    this.input = input;
    this.options = {
      relaxationIterations: options.relaxationIterations ?? 72,
      grid: options.grid ?? 0.5,
      treemapSeed: options.treemapSeed,
      relaxationSeed: options.relaxationSeed,
    };
  }

  solve(): LayoutEngineResult {
    const warnings: string[] = [];
    const { lot, zones: specs, adjacencies } = this.input;
    const lotArea = lot.width * lot.height;

    if (lotArea <= 0 || specs.length === 0) {
      return emptyResult(warnings, "Lote o zonas inválidos.");
    }

    const totalIdeal = specs.reduce((s, z) => s + z.idealArea, 0);
    if (totalIdeal <= 0) {
      warnings.push("idealArea total es 0; se reparte equitativamente.");
    }

    const scale = totalIdeal > 0 ? lotArea / totalIdeal : lotArea / specs.length;

    let orderedSpecs = specs;
    if (this.options.treemapSeed != null) {
      orderedSpecs = seededShuffle(specs, this.options.treemapSeed);
    }

    const scaledAreas = orderedSpecs.map((z) => z.idealArea * scale);

    const treemapRects = squarifiedTreemap(
      0,
      0,
      lot.width,
      lot.height,
      scaledAreas,
    );

    let placed: PlacedZone[] = orderedSpecs.map((spec, i) => {
      const r = treemapRects[i];
      const aspectRatioRange = resolveAspectRange(
        spec.type,
        spec.aspectRatioRange,
      );
      return {
        id: spec.id,
        label: spec.label,
        type: spec.type,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        area: r.w * r.h,
        aspectRatioRange,
        description: spec.description,
        group: spec.group,
      };
    });

    const treemapFill = placed.reduce((s, z) => s + z.w * z.h, 0) / lotArea;

    const relaxed = relaxLayout(
      placed,
      adjacencies,
      lot,
      this.options.relaxationIterations,
    );
    placed = relaxed.zones.map((z) =>
      snapRect(z, lot, this.options.grid),
    );

    if (relaxed.overlapCount > 0) {
      warnings.push(
        `${relaxed.overlapCount} solape(s) residual(es) tras relajación; aplicando separación final.`,
      );
      placed = this.finalSeparationPass(placed);
    }

    const aspectViolations = countAspectViolations(placed);
    if (aspectViolations > 0) {
      warnings.push(
        `${aspectViolations} zona(s) fuera de aspectRatioRange tras relajación.`,
      );
    }

    const adjacencyPairs = adjacencies.map((a) => ({
      from: a.from,
      to: a.to,
    }));
    const sharedWalls = collectSharedWalls(placed, adjacencyPairs);
    const doors = generateDoorsFromAdjacencies(placed, adjacencies);

    if (relaxed.adjacencySatisfied < adjacencies.length) {
      warnings.push(
        `Adyacencias satisfechas: ${relaxed.adjacencySatisfied}/${adjacencies.length}.`,
      );
    }

    return {
      zones: placed,
      doors,
      sharedWalls,
      warnings,
      metrics: {
        iterations: this.options.relaxationIterations,
        overlapCount: relaxed.overlapCount,
        adjacencySatisfied: relaxed.adjacencySatisfied,
        adjacencyTotal: adjacencies.length,
        treemapFill,
      },
    };
  }

  /** Hard separation when floating-point overlap remains. */
  private finalSeparationPass(zones: PlacedZone[]): PlacedZone[] {
    const state = zones.map((z) => ({ ...z }));
    const lot = this.input.lot;

    for (let pass = 0; pass < 12; pass++) {
      let moved = false;
      for (let i = 0; i < state.length; i++) {
        for (let j = i + 1; j < state.length; j++) {
          const a = state[i];
          const b = state[j];
          const ox =
            Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy =
            Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 0.2 || oy <= 0.2) continue;
          moved = true;
          if (ox < oy) {
            const s = ox / 2 + 0.1;
            if (a.x + a.w / 2 < b.x + b.w / 2) {
              a.x -= s;
              b.x += s;
            } else {
              a.x += s;
              b.x -= s;
            }
          } else {
            const s = oy / 2 + 0.1;
            if (a.y + a.h / 2 < b.y + b.h / 2) {
              a.y -= s;
              b.y += s;
            } else {
              a.y += s;
              b.y -= s;
            }
          }
          Object.assign(a, clampRectToLot(a, lot));
          Object.assign(b, clampRectToLot(b, lot));
        }
      }
      if (!moved) break;
    }

    return state;
  }
}

function emptyResult(warnings: string[], msg: string): LayoutEngineResult {
  warnings.push(msg);
  return {
    zones: [],
    doors: [],
    sharedWalls: [],
    warnings,
    metrics: {
      iterations: 0,
      overlapCount: 0,
      adjacencySatisfied: 0,
      adjacencyTotal: 0,
      treemapFill: 0,
    },
  };
}

/** Convenience runner without instantiating manually. */
export function runConstraintLayout(
  input: ConstraintPlanInput,
  options?: LayoutEngineOptions,
): LayoutEngineResult {
  return new ConstraintLayoutEngine(input, options).solve();
}
