import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import {
  formatRoomCountsForPrompt,
  type UserPreferences,
} from "@/lib/onboarding/user-preferences";

export function summarizePreferences(prefs: UserPreferences) {
  return {
    planShape: prefs.planShape,
    floorCount: prefs.floorCount,
    areaM2: prefs.lotSize.areaM2,
    areaUnit: prefs.lotSize.unit,
    roomCounts: prefs.roomCounts,
    roomsSummary: formatRoomCountsForPrompt(prefs.roomCounts),
    basicNeedsPreview: prefs.basicNeeds.slice(0, 120),
    completedAt: prefs.completedAt,
  };
}

export function summarizeProgram(program: ArchitecturalProgram) {
  const sumIdeal = program.programmaticZones.reduce(
    (s, z) => s + z.idealAreaM2,
    0,
  );
  const target = program.globalConfig.targetTotalAreaM2;
  return {
    title: program.title,
    zoneCount: program.programmaticZones.length,
    edgeCount: program.topologyGraph.length,
    targetTotalAreaM2: target,
    sumIdealAreaM2: Math.round(sumIdeal * 10) / 10,
    idealVsTargetRatio: target > 0 ? Math.round((sumIdeal / target) * 1000) / 1000 : 0,
    zones: program.programmaticZones.map((z) => ({
      id: z.id,
      type: z.type,
      idealAreaM2: z.idealAreaM2,
      exteriorAnchor: z.exteriorAnchor,
      aspectRatioRange: z.aspectRatioRange,
    })),
  };
}

export function summarizeLayout(layout: FloorplanLayoutResult) {
  return {
    planShape: layout.container.shape,
    containerPx: {
      x: layout.container.x,
      y: layout.container.y,
      w: layout.container.width,
      h: layout.container.height,
      buildableAreaPx: layout.container.buildableAreaPx,
    },
    fillRatio: Math.round(layout.fillRatio * 1000) / 1000,
    zoneCount: layout.zones.length,
    warnings: layout.warnings,
    placed: layout.zones.map((z) => ({
      id: z.id,
      x: Math.round(z.x),
      y: Math.round(z.y),
      w: Math.round(z.width),
      h: Math.round(z.height),
      areaPx: Math.round(z.width * z.height),
      aspect: Math.round((z.width / z.height) * 100) / 100,
    })),
    mask:
      layout.mask != null
        ? {
            cols: layout.mask.cols,
            rows: layout.mask.rows,
            buildableCellCount: layout.mask.buildableCellCount,
            m2PerCell: layout.mask.m2PerCell,
            pxPerMeter: layout.pxPerMeter,
          }
        : null,
    cellOccupancyCount: layout.cellOccupancy
      ? Object.keys(layout.cellOccupancy).length
      : 0,
    template: layout.templateMeta
      ? {
          id: layout.templateMeta.templateId,
          label: layout.templateMeta.templateLabel,
          selectionReason: layout.templateMeta.selectionReason,
          unmappedRooms: layout.templateMeta.unmappedRooms,
          validationOk: layout.templateMeta.validation.ok,
        }
      : null,
  };
}
