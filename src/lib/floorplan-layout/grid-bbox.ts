import { CELL_SIZE_PX } from "./grid-scale";
import { parseCellKey } from "./lot-mask";
import type { LayoutRect } from "./types";

export type OccupiedCell = {
  col: number;
  row: number;
  zoneId: string;
};

/** Convierte el mapa celda→zona en lista con índices de grilla. */
export function occupancyToAllCells(
  cellOccupancy: Record<string, string>,
): OccupiedCell[] {
  const all: OccupiedCell[] = [];
  for (const [key, zoneId] of Object.entries(cellOccupancy)) {
    const pos = parseCellKey(key);
    if (!pos) continue;
    all.push({ col: pos.col, row: pos.row, zoneId });
  }
  return all;
}

export function cellsForZoneId(
  allCells: OccupiedCell[],
  zoneId: string,
): Array<{ col: number; row: number }> {
  return allCells
    .filter((c) => c.zoneId === zoneId)
    .map(({ col, row }) => ({ col, row }));
}

/**
 * Caja delimitadora alineada a la grilla: solo las celdas de la zona.
 * x/y/w/h = índices min/max × CELL_SIZE_PX (no ancho del lienzo).
 */
export function boundingRectFromZoneCells(
  zoneCells: Array<{ col: number; row: number }>,
  originX = 0,
  originY = 0,
  cellSizePx = CELL_SIZE_PX,
): LayoutRect | null {
  if (zoneCells.length === 0) return null;

  const minCol = Math.min(...zoneCells.map((c) => c.col));
  const maxCol = Math.max(...zoneCells.map((c) => c.col));
  const minRow = Math.min(...zoneCells.map((c) => c.row));
  const maxRow = Math.max(...zoneCells.map((c) => c.row));

  return {
    x: originX + minCol * cellSizePx,
    y: originY + minRow * cellSizePx,
    width: (maxCol - minCol + 1) * cellSizePx,
    height: (maxRow - minRow + 1) * cellSizePx,
  };
}

/** Área real en px² = número de celdas × cellSize² (no bbox inflado). */
export function trueCellAreaPx(
  cellCount: number,
  cellSizePx = CELL_SIZE_PX,
): number {
  return cellCount * cellSizePx * cellSizePx;
}
