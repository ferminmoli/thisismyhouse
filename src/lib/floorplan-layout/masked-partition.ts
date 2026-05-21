import type {
  ArchitecturalProgram,
  ProgrammaticZone,
} from "@/lib/architectural-program/types";
import { seededShuffle } from "./seeded-rng";
import type { PlacedZoneRect } from "./types";
import {
  aspectInRange,
  aspectRatio,
  aspectViolation,
} from "./geometry";
import {
  boundingRectFromZoneCells,
  cellsForZoneId,
  occupancyToAllCells,
} from "./grid-bbox";
import { CELL_SIZE_PX } from "./grid-scale";
import {
  cellIsBuildable,
  cellKey,
  getCellNeighbors,
  isCellAdjacentToVoid,
} from "./lot-mask";
import type { LotMask } from "./types";

type Cell = { col: number; row: number };
type ZoneSlice = ProgrammaticZone & { targetCells: number };

type ZoneRegion = {
  slice: ZoneSlice;
  cells: Cell[];
};

const ANCHOR_FIRST_IDS = new Set([
  "ACCESO",
  "PATIO_PARRILLA",
  "PATIO",
  "ENTRADA",
]);

const ASPECT_SLACK_STRICT = 0.15;
const ASPECT_SLACK_RELAXED = 0.45;

function zoneSortPriority(z: ProgrammaticZone): number {
  const id = z.id.toUpperCase();
  if (ANCHOR_FIRST_IDS.has(id) || z.type === "outdoor") return 0;
  if (z.exteriorAnchor === "front") return 1;
  if (z.exteriorAnchor === "back") return 2;
  return 3;
}

function bboxFromCellsUnit(cells: Cell[]): {
  width: number;
  height: number;
} | null {
  if (cells.length === 0) return null;
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxCol = Math.max(...cells.map((c) => c.col));
  const minRow = Math.min(...cells.map((c) => c.row));
  const maxRow = Math.max(...cells.map((c) => c.row));
  return {
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

function virtualRectFromCells(cells: Cell[]) {
  const box = bboxFromCellsUnit(cells);
  if (!box) return null;
  return {
    x: 0,
    y: 0,
    width: box.width * CELL_SIZE_PX,
    height: box.height * CELL_SIZE_PX,
  };
}

function canAddCellMaintainingAspect(
  current: Cell[],
  candidate: Cell,
  aspectRange: [number, number],
  slack: number,
): boolean {
  if (current.length === 0) return true;
  const trial = [...current, candidate];
  const rect = virtualRectFromCells(trial);
  if (!rect) return false;
  if (trial.length <= 2) return true;

  const ar = aspectRatio(rect);
  const [min, max] = aspectRange;
  const lo = min * (1 - slack);
  const hi = max * (1 + slack);
  if (ar >= lo && ar <= hi) return true;

  return aspectViolation(rect, aspectRange) <= slack * Math.max(max, 1 / min);
}

function scoreSeedCell(
  zone: ProgrammaticZone,
  cell: Cell,
  mask: LotMask,
): number {
  const id = zone.id.toUpperCase();
  let s = 0;

  if (zone.type === "outdoor" || id.includes("PATIO")) {
    if (isCellAdjacentToVoid(cell.col, cell.row, mask)) s += 1000;
    if (zone.exteriorAnchor === "back") s += 200 + cell.row * 2;
    s += cell.col;
  } else if (
    zone.exteriorAnchor === "front" ||
    id.includes("ACCESO") ||
    zone.type === "circulation"
  ) {
    s += (mask.rows - 1 - cell.row) * 50;
    s += mask.cols - Math.abs(cell.col - mask.cols * 0.35);
  } else if (zone.exteriorAnchor === "back") {
    s += cell.row * 30;
  } else if (zone.exteriorAnchor === "none") {
    s -= cell.row * 5;
    s += (mask.cols - cell.col) * 2;
  } else {
    s += mask.cols * mask.rows - cell.col - cell.row;
  }

  return s;
}

function listFreeBuildableCells(
  mask: LotMask,
  occupancy: Map<string, string>,
): Cell[] {
  const out: Cell[] = [];
  for (let c = 0; c < mask.cols; c++) {
    for (let r = 0; r < mask.rows; r++) {
      if (!cellIsBuildable(c, r, mask)) continue;
      const k = cellKey(c, r);
      if (!occupancy.has(k)) out.push({ col: c, row: r });
    }
  }
  return out;
}

function pickSeed(
  zone: ProgrammaticZone,
  mask: LotMask,
  occupancy: Map<string, string>,
): Cell | null {
  const free = listFreeBuildableCells(mask, occupancy);
  if (free.length === 0) return null;

  return free.reduce((best, cell) =>
    scoreSeedCell(zone, cell, mask) > scoreSeedCell(zone, best, mask)
      ? cell
      : best,
  );
}

/** Vecinos 4-conectados libres que tocan al menos una celda de la región. */
function frontierCandidates(
  region: Cell[],
  mask: LotMask,
  occupancy: Map<string, string>,
): Cell[] {
  const seen = new Set<string>();
  const out: Cell[] = [];

  for (const cell of region) {
    for (const n of getCellNeighbors(cell.col, cell.row)) {
      if (!cellIsBuildable(n.col, n.row, mask)) continue;
      const k = cellKey(n.col, n.row);
      if (occupancy.has(k)) continue;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
    }
  }

  return out;
}

function bboxAreaCells(cells: Cell[]): number {
  const b = bboxFromCellsUnit(cells);
  return b ? b.width * b.height : 0;
}

function buildTopologyNeighbors(
  program: ArchitecturalProgram,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const link = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    if (!map.has(b)) map.set(b, new Set());
    map.get(a)!.add(b);
    map.get(b)!.add(a);
  };
  for (const edge of program.topologyGraph) {
    link(edge.from, edge.to);
  }
  return map;
}

function topologyFrontierBonus(
  zoneId: string,
  candidate: Cell,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
): number {
  const partners = topology.get(zoneId);
  if (!partners?.size) return 0;
  let bonus = 0;
  for (const n of getCellNeighbors(candidate.col, candidate.row)) {
    const owner = occupancy.get(cellKey(n.col, n.row));
    if (owner && partners.has(owner)) bonus += 450;
  }
  return bonus;
}

function scoreGrowthCandidate(
  region: ZoneRegion,
  candidate: Cell,
  mask: LotMask,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
): number {
  const trial = [...region.cells, candidate];
  const rect = virtualRectFromCells(trial);
  let s = scoreSeedCell(region.slice, candidate, mask);

  s += topologyFrontierBonus(
    region.slice.id,
    candidate,
    occupancy,
    topology,
  );

  if (rect) {
    s -= aspectViolation(rect, region.slice.aspectRatioRange) * 80;
  }

  const beforeArea = bboxAreaCells(region.cells);
  const afterArea = bboxAreaCells(trial);
  s -= (afterArea - beforeArea) * 15;

  const centerCol =
    region.cells.reduce((sum, c) => sum + c.col, 0) / region.cells.length;
  const centerRow =
    region.cells.reduce((sum, c) => sum + c.row, 0) / region.cells.length;
  s -= Math.abs(candidate.col - centerCol) + Math.abs(candidate.row - centerRow);

  return s;
}

function pickBestFrontierCell(
  region: ZoneRegion,
  candidates: Cell[],
  mask: LotMask,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
  aspectSlack: number,
): Cell | null {
  let best: Cell | null = null;
  let bestScore = -Infinity;

  for (const c of candidates) {
    if (
      !canAddCellMaintainingAspect(
        region.cells,
        c,
        region.slice.aspectRatioRange,
        aspectSlack,
      )
    ) {
      continue;
    }
    const sc = scoreGrowthCandidate(
      region,
      c,
      mask,
      occupancy,
      topology,
    );
    if (sc > bestScore) {
      bestScore = sc;
      best = c;
    }
  }

  return best;
}

function addCellToRegion(
  region: ZoneRegion,
  cell: Cell,
  occupancy: Map<string, string>,
): void {
  const k = cellKey(cell.col, cell.row);
  occupancy.set(k, region.slice.id);
  region.cells.push(cell);
}

function regionDeficit(region: ZoneRegion): number {
  return Math.max(0, region.slice.targetCells - region.cells.length);
}

function balanceTargetCells(
  slices: ZoneSlice[],
  buildableCellCount: number,
): void {
  let allocated = slices.reduce((s, z) => s + z.targetCells, 0);

  while (allocated > buildableCellCount) {
    const smallest = slices
      .filter((z) => z.targetCells > 1)
      .sort((a, b) => a.targetCells - b.targetCells)[0];
    if (!smallest) break;
    smallest.targetCells--;
    allocated--;
  }

  while (allocated < buildableCellCount) {
    const largest = [...slices].sort(
      (a, b) => b.targetCells - a.targetCells,
    )[0];
    if (!largest) break;
    largest.targetCells++;
    allocated++;
  }
}

function slicesFromZones(
  zones: ProgrammaticZone[],
  mask: LotMask,
): ZoneSlice[] {
  const m2PerCell = mask.m2PerCell ?? 1;

  const slices: ZoneSlice[] = [...zones]
    .map((z) => ({
      ...z,
      targetCells: Math.max(1, Math.round(z.idealAreaM2 / m2PerCell)),
    }))
    .sort((a, b) => {
      const pa = zoneSortPriority(a);
      const pb = zoneSortPriority(b);
      if (pa !== pb) return pa - pb;
      return b.targetCells - a.targetCells;
    });

  balanceTargetCells(slices, mask.buildableCellCount);
  return slices;
}

/** BFS: todas las celdas de la zona deben ser un solo componente conexo. */
function isRegionContiguous(cells: Cell[]): boolean {
  if (cells.length <= 1) return true;

  const keys = new Set(cells.map((c) => cellKey(c.col, c.row)));
  const start = cells[0];
  const queue = [start];
  const visited = new Set<string>([cellKey(start.col, start.row)]);

  while (queue.length > 0) {
    const c = queue.shift()!;
    for (const n of getCellNeighbors(c.col, c.row)) {
      const k = cellKey(n.col, n.row);
      if (!keys.has(k) || visited.has(k)) continue;
      visited.add(k);
      queue.push(n);
    }
  }

  return visited.size === keys.size;
}

/**
 * Round-robin: una celda por turno, solo vecinos 4-conectados de la misma zona.
 */
function growRegionsRoundRobin(
  regions: ZoneRegion[],
  mask: LotMask,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
  aspectSlack: number,
): number {
  let grew = 0;

  for (const region of regions) {
    if (regionDeficit(region) <= 0) continue;

    const candidates = frontierCandidates(region.cells, mask, occupancy);
    const pick = pickBestFrontierCell(
      region,
      candidates,
      mask,
      occupancy,
      topology,
      aspectSlack,
    );
    if (!pick) continue;

    addCellToRegion(region, pick, occupancy);
    grew++;
  }

  return grew;
}

function seedAllRegions(
  slices: ZoneSlice[],
  mask: LotMask,
  occupancy: Map<string, string>,
  warnings: string[],
): ZoneRegion[] {
  const regions: ZoneRegion[] = [];

  for (const slice of slices) {
    const seed = pickSeed(slice, mask, occupancy);
    if (!seed) {
      warnings.push(`${slice.id}: sin celda semilla libre`);
      regions.push({ slice, cells: [] });
      continue;
    }
    const region: ZoneRegion = { slice, cells: [] };
    addCellToRegion(region, seed, occupancy);
    regions.push(region);
  }

  return regions;
}

function fillOrphansContiguous(
  regions: ZoneRegion[],
  mask: LotMask,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
  aspectSlack: number,
): number {
  let placed = 0;
  let free = listFreeBuildableCells(mask, occupancy);

  while (free.length > 0) {
    let progress = 0;

    const ordered = [...regions].sort(
      (a, b) => regionDeficit(b) - regionDeficit(a),
    );

    for (const region of ordered) {
      if (free.length === 0) break;

      const candidates = frontierCandidates(region.cells, mask, occupancy);
      const pick = pickBestFrontierCell(
        region,
        candidates,
        mask,
        occupancy,
        topology,
        aspectSlack,
      );
      if (!pick) continue;

      addCellToRegion(region, pick, occupancy);
      placed++;
      progress++;
      free = listFreeBuildableCells(mask, occupancy);
    }

    if (progress === 0) break;
  }

  return placed;
}

export type MaskPartitionOptions = {
  layoutSeed?: number;
};

function runCoordinatedPartition(
  slices: ZoneSlice[],
  mask: LotMask,
  occupancy: Map<string, string>,
  topology: Map<string, Set<string>>,
  warnings: string[],
  options: MaskPartitionOptions = {},
): ZoneRegion[] {
  let orderedSlices = slices;
  if (options.layoutSeed != null) {
    orderedSlices = seededShuffle(slices, options.layoutSeed);
  }

  const regions = seedAllRegions(orderedSlices, mask, occupancy, warnings);

  const maxPasses = mask.buildableCellCount * slices.length + 10;
  for (let pass = 0; pass < maxPasses; pass++) {
    const totalDeficit = regions.reduce((s, r) => s + regionDeficit(r), 0);
    if (totalDeficit === 0) break;

    const grew = growRegionsRoundRobin(
      regions,
      mask,
      occupancy,
      topology,
      ASPECT_SLACK_STRICT,
    );
    if (grew === 0) break;
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    const totalDeficit = regions.reduce((s, r) => s + regionDeficit(r), 0);
    if (totalDeficit === 0) break;

    const grew = growRegionsRoundRobin(
      regions,
      mask,
      occupancy,
      topology,
      ASPECT_SLACK_RELAXED,
    );
    if (grew === 0) break;
  }

  const orphans = listFreeBuildableCells(mask, occupancy).length;
  if (orphans > 0) {
    fillOrphansContiguous(
      regions,
      mask,
      occupancy,
      topology,
      ASPECT_SLACK_RELAXED,
    );
    const remaining = listFreeBuildableCells(mask, occupancy).length;
    if (remaining > 0) {
      warnings.push(`Celdas huérfanas sin anclaje contiguo: ${remaining}`);
    }
  }

  for (const region of regions) {
    if (region.cells.length === 0) continue;
    if (!isRegionContiguous(region.cells)) {
      warnings.push(`${region.slice.id}: región fragmentada (bug interno)`);
    }
    if (regionDeficit(region) > 0) {
      warnings.push(
        `${region.slice.id}: ${region.cells.length}/${region.slice.targetCells} celdas (crecimiento insuficiente)`,
      );
    }
  }

  return regions;
}

export type MaskPartitionResult = {
  placed: PlacedZoneRect[];
  warnings: string[];
  cellOccupancy: Record<string, string>;
};

/**
 * Partición L por grilla: semilla + crecimiento round-robin 4-conectado + aspecto.
 */
export function partitionZonesOnMask(
  mask: LotMask,
  zones: ProgrammaticZone[],
  program: ArchitecturalProgram,
  options: MaskPartitionOptions = {},
): MaskPartitionResult {
  const warnings: string[] = [];
  const cellOccupancy: Record<string, string> = {};

  if (zones.length === 0) {
    return { placed: [], warnings: ["Sin zonas en el programa"], cellOccupancy };
  }

  if (mask.buildableCellCount === 0) {
    return {
      placed: [],
      warnings: ["Lote sin celdas habitables"],
      cellOccupancy,
    };
  }

  const occupancy = new Map<string, string>();
  const slices = slicesFromZones(zones, mask);
  const topology = buildTopologyNeighbors(program);

  runCoordinatedPartition(
    slices,
    mask,
    occupancy,
    topology,
    warnings,
    options,
  );

  for (const [k, id] of occupancy) {
    cellOccupancy[k] = id;
  }

  const allCells = occupancyToAllCells(cellOccupancy);
  const placed: PlacedZoneRect[] = [];

  for (const zone of zones) {
    const zoneCells = cellsForZoneId(allCells, zone.id);
    if (zoneCells.length === 0) {
      warnings.push(`${zone.id}: no se asignaron celdas`);
      continue;
    }

    const rect = boundingRectFromZoneCells(
      zoneCells,
      mask.bbox.x,
      mask.bbox.y,
      CELL_SIZE_PX,
    );
    if (!rect) {
      warnings.push(`${zone.id}: bbox inválido`);
      continue;
    }

    if (!isRegionContiguous(zoneCells)) {
      warnings.push(`${zone.id}: regiones no contiguas`);
    }

    if (!aspectInRange(rect, zone.aspectRatioRange)) {
      warnings.push(
        `${zone.id}: aspecto ${aspectRatio(rect).toFixed(2)} fuera de rango`,
      );
    }

    placed.push({
      id: zone.id,
      label: zone.label,
      type: zone.type,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }

  const covered = Object.keys(cellOccupancy).length;
  if (covered < mask.buildableCellCount) {
    warnings.push(
      `Celdas habitables cubiertas: ${covered}/${mask.buildableCellCount}`,
    );
  }

  return { placed, warnings, cellOccupancy };
}
