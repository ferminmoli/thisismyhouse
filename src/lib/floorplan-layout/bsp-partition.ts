import type { ProgrammaticZone } from "@/lib/architectural-program/types";
import type { LayoutRect, PlacedZoneRect } from "./types";
import {
  aspectInRange,
  aspectRatio,
  aspectViolation,
  rectArea,
  splitRect,
  type SplitAxis,
} from "./geometry";

type ZoneSlice = ProgrammaticZone & { weight: number };

function chooseSplitAxis(
  rect: LayoutRect,
  zone: ProgrammaticZone,
  ratio: number,
  preferVertical: boolean,
): SplitAxis {
  const order: SplitAxis[] = preferVertical
    ? ["vertical", "horizontal"]
    : ["horizontal", "vertical"];

  let best: { axis: SplitAxis; score: number } | null = null;

  for (const axis of order) {
    const [first] = splitRect(rect, axis, ratio);
    const score = aspectViolation(first, zone.aspectRatioRange);
    if (!best || score < best.score) {
      best = { axis, score };
    }
    if (score === 0) return axis;
  }

  return best!.axis;
}

function partitionRecursive(
  rect: LayoutRect,
  zones: ZoneSlice[],
  depth: number,
  warnings: string[],
): PlacedZoneRect[] {
  if (zones.length === 0) return [];

  if (zones.length === 1) {
    const z = zones[0];
    if (!aspectInRange(rect, z.aspectRatioRange)) {
      warnings.push(
        `${z.id}: proporción ${aspectRatio(rect).toFixed(2)} fuera de [${z.aspectRatioRange[0]}, ${z.aspectRatioRange[1]}] — el contenedor no permite mejor ajuste sin huecos`,
      );
    }
    return [
      {
        id: z.id,
        label: z.label,
        type: z.type,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    ];
  }

  const totalWeight = zones.reduce((s, z) => s + z.weight, 0);
  const head = zones[0];
  const tail = zones.slice(1);
  const ratio = totalWeight > 0 ? head.weight / totalWeight : 1 / zones.length;

  const preferVertical = depth % 2 === 0;
  const axis = chooseSplitAxis(rect, head, ratio, preferVertical);
  const [firstRect, restRect] = splitRect(rect, axis, ratio);

  return [
    ...partitionRecursive(firstRect, [head], depth + 1, warnings),
    ...partitionRecursive(restRect, tail, depth + 1, warnings),
  ];
}

/**
 * BSP adaptado: zonas ordenadas por área, cortes alternados V/H,
 * proporción = área zona / suma restante del nodo.
 */
export function partitionZonesBsp(
  container: LayoutRect,
  zones: ProgrammaticZone[],
): { placed: PlacedZoneRect[]; warnings: string[] } {
  const warnings: string[] = [];

  if (zones.length === 0) {
    return { placed: [], warnings: ["Sin zonas en el programa"] };
  }

  const sorted: ZoneSlice[] = [...zones]
    .map((z) => ({
      ...z,
      weight: Math.max(z.idealAreaM2, 0.001),
    }))
    .sort((a, b) => b.weight - a.weight);

  const placed = partitionRecursive(container, sorted, 0, warnings);
  return { placed, warnings };
}
