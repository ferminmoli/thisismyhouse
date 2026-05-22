import type { SvgPlanRender } from "../floorPlanPipelineTypes";
import { renderHatchDefs } from "./hatchDefs";
import { renderSimpleRoomBoundaries } from "./simpleRoomBoundaryLayer";
import { renderOpenings, renderWindows } from "./openingLayer";
import { renderFurniture } from "./furnitureLayer";
import { renderPreliminaryDimensions } from "./dimensionLayer";
import { renderRoomLabels } from "./roomLabelLayerSvg";
import {
  renderWallGraphDebugAnnotations,
  renderWallGraphLayer,
} from "./wallGraphLayer";
import {
  escapeXml,
  planTransformAttr,
  SHEET,
} from "./planGeometryUtils";
import {
  renderOrientativeNorth,
  renderSheetFrame,
  renderTitleBlock,
} from "./sheetTitleBlock";
import type {
  ArchitecturalPlanViewModel,
  RenderArchitecturalPlanOptions,
} from "./types";

export function renderArchitecturalPlanSvg(
  model: ArchitecturalPlanViewModel,
  options: RenderArchitecturalPlanOptions = {},
): SvgPlanRender {
  const wallGraphDebug = options.wallGraphDebug === true;
  const { layout } = model;
  const furnitureZones = model.rooms.map((r) => ({
    id: r.id,
    label: r.displayName,
    type: r.zoneType,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    sourceRoomId: r.id,
    slotId: r.id,
    priority: "medium" as const,
  }));
  const viewBox = `0 0 ${layout.sheetWidth} ${layout.sheetHeight}`;
  const transform = planTransformAttr(layout);

  const roomBoundaries = renderSimpleRoomBoundaries(model.rooms, {
    includeStroke: !wallGraphDebug,
  });

  const wallLayer =
    wallGraphDebug && model.walls.length > 0
      ? `<g id="wall-graph">${renderWallGraphLayer(model.walls, model.openings)}</g>` +
        renderWallGraphDebugAnnotations(model.walls, model.openings)
      : "";

  const openingsLayer = wallGraphDebug
    ? ""
    : `<g id="openings">${renderOpenings(model.openings)}</g>`;

  const dimensionsLayer =
    !wallGraphDebug && model.dimensions.length > 0
      ? renderPreliminaryDimensions(model.dimensions)
      : "";

  const drawing =
    `<g id="arch-plan-drawing" transform="${transform}">` +
    `<g id="simple-room-boundaries">${roomBoundaries}</g>` +
    wallLayer +
    (model.showFurniture
      ? `<g id="furniture">${renderFurniture(model.furniture, furnitureZones)}</g>`
      : "") +
    openingsLayer +
    `<g id="windows">${renderWindows(model.windows)}</g>` +
    dimensionsLayer +
    `<g id="labels">${renderRoomLabels(model.labels)}</g>` +
    `</g>`;

  const chrome =
    renderSheetFrame() +
    (model.showOrientativeNorth ? renderOrientativeNorth(layout) : "") +
    renderTitleBlock(model.sheet);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ` +
    `role="img" aria-label="${escapeXml(model.title)} — ${escapeXml(model.variantLabel)}">` +
    `<title>${escapeXml(model.title)} — ${escapeXml(model.variantLabel)}</title>` +
    `<desc>Planta preliminar conceptual — no apto para obra</desc>` +
    renderHatchDefs() +
    chrome +
    drawing +
    `</svg>`;

  return {
    variantId: model.variantId,
    variantLabel: model.variantLabel,
    svg,
    viewBox,
    coordinateSystem: "normalized_canvas",
    legend: [],
    warnings: [],
  };
}

export { SHEET };
