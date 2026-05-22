import type { GeneratedPlan } from "../generatedPlan";
import type { ArchitecturalPlanViewModel, BuildViewModelInput } from "./types";
import {
  buildOpenings,
  buildRooms,
  buildWallSegments,
  buildWindows,
  computePlanLayout,
} from "./planGeometryUtils";
import { buildDimensionsFromPlan } from "./preliminaryDimensions";
import { buildFurniture } from "./furnitureLayer";
import { buildRoomLabels } from "./roomLabelLayer";

export function buildPlanViewModel(
  plan: GeneratedPlan,
  input: BuildViewModelInput,
): ArchitecturalPlanViewModel {
  const rooms = buildRooms(plan);
  const wallGraphDebug = input.wallGraphDebug === true;
  const walls = wallGraphDebug ? buildWallSegments(rooms) : [];
  const openings = buildOpenings(plan);
  const windows = buildWindows(plan);
  const layout = computePlanLayout(rooms);
  const showFurniture = input.showFurniture !== false;

  const labels = buildRoomLabels(rooms, openings, windows, plan);
  const furniture = buildFurniture(plan, showFurniture);

  const est = plan.metadata.areaEstimate;
  const areasEstimated = !est || est.confidence !== "high";
  const { dimensions } = buildDimensionsFromPlan(plan, rooms);

  return {
    variantId: input.variantId,
    variantLabel: input.variantLabel,
    title: input.title ?? plan.title,
    rooms,
    walls,
    openings,
    windows,
    furniture,
    labels,
    dimensions,
    layout,
    sheet: {
      projectTitle: input.title ?? plan.title,
      variantLabel: input.variantLabel,
      coveredM2: est?.estimatedCoveredAreaM2 ?? null,
      outdoorM2: est?.estimatedOutdoorAreaM2 ?? null,
      semiCoveredM2: est?.estimatedSemiCoveredAreaM2 ?? null,
      areasEstimated,
      showGraphicScale: false,
      showPreliminaryDimensions: dimensions.length > 0,
    },
    showOrientativeNorth: !input.orientationKnown,
    showFurniture,
  };
}
