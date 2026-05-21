export {
  computeFloorplanLayout,
  computeFloorplanLayoutFromProgram,
} from "./compute-layout";
export {
  generateLayoutVariations,
  type LayoutVariation,
} from "./generate-layout-variations";
export { getLotContainer, containerArea } from "./lot-container";
export {
  buildLotMask,
  buildableAreaPx,
  isPointBuildable,
  rectFullyInsideMask,
  MASK_GRID_COLS,
  MASK_GRID_ROWS,
  CELL_SIZE_PX,
} from "./lot-mask";
export {
  L_SHAPE_CANVAS_PX,
  pxPerMeterFromM2PerCell,
  widthPxToMeters,
} from "./grid-scale";
export {
  boundingRectFromZoneCells,
  cellsForZoneId,
  occupancyToAllCells,
} from "./grid-bbox";
export { partitionZonesOnMask } from "./masked-partition";
export { partitionZonesBsp } from "./bsp-partition";
export {
  aspectInRange,
  aspectRatio,
  aspectViolation,
  rectArea,
  splitRect,
} from "./geometry";
export type {
  FloorplanLayoutInput,
  FloorplanLayoutResult,
  LayoutRect,
  LotContainer,
  LotMask,
  PlacedZoneRect,
} from "./types";
