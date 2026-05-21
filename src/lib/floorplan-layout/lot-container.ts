import type { PlanShape } from "@/lib/onboarding/user-preferences";
import {
  isLShapeVoidCell,
  L_SHAPE_CANVAS_PX,
  MASK_GRID_COLS,
  MASK_GRID_ROWS,
} from "./grid-scale";
import type { LotContainer } from "./types";

/** Bounding box del lote madre en píxeles de Canvas. */
export function getLotContainer(planShape: PlanShape): LotContainer {
  switch (planShape) {
    case "square":
      return { shape: planShape, x: 0, y: 0, width: 600, height: 600 };
    case "l_shape":
      return {
        shape: planShape,
        x: 0,
        y: 0,
        width: L_SHAPE_CANVAS_PX,
        height: L_SHAPE_CANVAS_PX,
      };
    case "rectangular":
    default:
      return { shape: planShape, x: 0, y: 0, width: 800, height: 500 };
  }
}

export function containerArea(container: LotContainer): number {
  return container.width * container.height;
}

/** Celdas habitables en grilla L explícita (75). */
export function lShapeBuildableCellCount(): number {
  let n = 0;
  for (let c = 0; c < MASK_GRID_COLS; c++) {
    for (let r = 0; r < MASK_GRID_ROWS; r++) {
      if (!isLShapeVoidCell(c, r)) n++;
    }
  }
  return n;
}
