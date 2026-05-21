/** Grilla L: 10×10 celdas, 40 px/celda → lienzo 400×400. */

export const MASK_GRID_COLS = 10;
export const MASK_GRID_ROWS = 10;
export const CELL_SIZE_PX = 40;

/** Lote en L: bounding box cuadrado de render. */
export const L_SHAPE_CANVAS_PX = MASK_GRID_COLS * CELL_SIZE_PX;

/**
 * Vacío superior-derecho (índices 1-based: columnas 6–10, filas 1–5).
 * 0-based: col ∈ [5,9], row ∈ [0,4] → 25 celdas void, 75 habitables.
 */
export function isLShapeVoidCell(col: number, row: number): boolean {
  return col >= 5 && row <= 4;
}

/** Lado de celda en metros si cada celda representa m2PerCell de área. */
export function cellSideMeters(m2PerCell: number): number {
  return Math.sqrt(m2PerCell);
}

/** px por metro para cotas: CELL_SIZE_PX px = cellSideMeters(m). */
export function pxPerMeterFromM2PerCell(m2PerCell: number): number {
  const sideM = cellSideMeters(m2PerCell);
  return sideM > 0 ? CELL_SIZE_PX / sideM : 10;
}

/** Convierte ancho en px a metros con escala real de celda. */
export function widthPxToMeters(widthPx: number, m2PerCell: number): number {
  return widthPx * (cellSideMeters(m2PerCell) / CELL_SIZE_PX);
}
