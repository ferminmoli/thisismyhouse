import type { PlanShape } from "@/lib/onboarding/user-preferences";
import { boundingRectFromZoneCells } from "./grid-bbox";
import {
  CELL_SIZE_PX,
  isLShapeVoidCell,
  MASK_GRID_COLS,
  MASK_GRID_ROWS,
} from "./grid-scale";
import type { LayoutRect, LotMask } from "./types";

export { MASK_GRID_COLS, MASK_GRID_ROWS, CELL_SIZE_PX } from "./grid-scale";

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function parseCellKey(key: string): { col: number; row: number } | null {
  const [c, r] = key.split(",").map(Number);
  if (!Number.isFinite(c) || !Number.isFinite(r)) return null;
  return { col: c, row: r };
}

export function cellCenter(
  col: number,
  row: number,
  mask: LotMask,
): { x: number; y: number } {
  return {
    x: mask.bbox.x + (col + 0.5) * mask.cellWidth,
    y: mask.bbox.y + (row + 0.5) * mask.cellHeight,
  };
}

function cellIsBuildable(col: number, row: number, mask: LotMask): boolean {
  if (col < 0 || row < 0 || col >= mask.cols || row >= mask.rows) {
    return false;
  }
  return mask.buildable[col][row];
}

export { cellIsBuildable };

function isPointInRect(x: number, y: number, rect: LayoutRect): boolean {
  return (
    x >= rect.x &&
    y >= rect.y &&
    x <= rect.x + rect.width &&
    y <= rect.y + rect.height
  );
}

/** Las 4 esquinas del rect deben estar dentro del polígono habitable. */
export function rectFullyInsideMask(rect: LayoutRect, mask: LotMask): boolean {
  const pts = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ];
  return pts.every((p) => isPointBuildable(p.x, p.y, mask));
}

export function isPointBuildable(
  x: number,
  y: number,
  mask: LotMask,
): boolean {
  if (mask.shape === "l_shape") {
    const col = Math.floor((x - mask.bbox.x) / mask.cellWidth);
    const row = Math.floor((y - mask.bbox.y) / mask.cellHeight);
    return cellIsBuildable(col, row, mask);
  }
  return (
    x >= mask.bbox.x &&
    y >= mask.bbox.y &&
    x <= mask.bbox.x + mask.bbox.width &&
    y <= mask.bbox.y + mask.bbox.height
  );
}

/**
 * Grilla 10×10; L: vacío explícito cols 6–10 × filas 1–5 (1-based).
 * Escala: m2PerCell = targetTotalAreaM2 / buildableCellCount.
 */
export function buildLotMask(
  shape: PlanShape,
  bbox: LayoutRect,
  targetTotalAreaM2: number,
): LotMask {
  const cols = MASK_GRID_COLS;
  const rows = MASK_GRID_ROWS;
  const cellWidth = CELL_SIZE_PX;
  const cellHeight = CELL_SIZE_PX;
  const buildable: boolean[][] = [];
  const voidCells: Array<{ col: number; row: number }> = [];
  let buildableCellCount = 0;

  for (let c = 0; c < cols; c++) {
    buildable[c] = [];
    for (let r = 0; r < rows; r++) {
      let ok: boolean;
      if (shape === "l_shape") {
        ok = !isLShapeVoidCell(c, r);
      } else {
        ok = true;
      }
      buildable[c][r] = ok;
      if (ok) buildableCellCount++;
      else if (shape === "l_shape") voidCells.push({ col: c, row: r });
    }
  }

  const m2PerCell =
    buildableCellCount > 0 ? targetTotalAreaM2 / buildableCellCount : 0;

  return {
    shape,
    bbox,
    cols,
    rows,
    cellWidth,
    cellHeight,
    buildable,
    buildableCellCount,
    voidCells,
    targetTotalAreaM2,
    m2PerCell,
  };
}

export function buildableAreaPx(mask: LotMask): number {
  return mask.buildableCellCount * mask.cellWidth * mask.cellHeight;
}

/** Rectángulo envolvente alineado a la grilla (sin coords flotantes). */
export function cellsToRect(
  cells: Array<{ col: number; row: number }>,
  mask: LotMask,
): LayoutRect | null {
  return boundingRectFromZoneCells(
    cells,
    mask.bbox.x,
    mask.bbox.y,
    CELL_SIZE_PX,
  );
}

export function getCellNeighbors(
  col: number,
  row: number,
): Array<{ col: number; row: number }> {
  return [
    { col: col - 1, row },
    { col: col + 1, row },
    { col, row: row - 1 },
    { col, row: row + 1 },
  ];
}

export function isCellAdjacentToVoid(
  col: number,
  row: number,
  mask: LotMask,
): boolean {
  for (const n of getCellNeighbors(col, row)) {
    if (!cellIsBuildable(n.col, n.row, mask)) return true;
  }
  return false;
}

/** Celdas cuyo centro cae dentro del rect (para verificación). */
export function cellsInsideRect(
  rect: LayoutRect,
  mask: LotMask,
): Array<{ col: number; row: number }> {
  const out: Array<{ col: number; row: number }> = [];
  for (let c = 0; c < mask.cols; c++) {
    for (let r = 0; r < mask.rows; r++) {
      if (!cellIsBuildable(c, r, mask)) continue;
      const { x, y } = cellCenter(c, r, mask);
      if (isPointInRect(x, y, rect)) out.push({ col: c, row: r });
    }
  }
  return out;
}
