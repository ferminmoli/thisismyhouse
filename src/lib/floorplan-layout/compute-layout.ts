import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { applyTemplateLayout } from "@/lib/architectural-templates/apply-template-layout";
import { scoreFloorplanLayout } from "@/lib/architectural-templates/plan-scoring";
import { isExperimentalGridEngine } from "@/lib/architectural-templates/config";
import type { PlanShape } from "@/lib/onboarding/user-preferences";
import { computeConstraintFloorplanLayout } from "./constraint-to-floorplan-layout";
import { pxPerMeterFromM2PerCell } from "./grid-scale";
import { buildLotMask, buildableAreaPx } from "./lot-mask";
import { partitionZonesOnMask } from "./masked-partition";
import { containerArea, getLotContainer } from "./lot-container";
import { partitionZonesBsp } from "./bsp-partition";
import { rectArea } from "./geometry";
import type { FloorplanLayoutInput, FloorplanLayoutResult } from "./types";
import { verifyLayoutCoverage, verifyLayoutOnMask } from "./verify";

export type FloorplanLayoutOptions = {
  /** Semilla para variantes (plantilla: permuta dormitorios; experimental: grilla/treemap). */
  layoutSeed?: number;
};

function computeExperimentalLayout(
  input: FloorplanLayoutInput,
  options: FloorplanLayoutOptions = {},
): FloorplanLayoutResult {
  const container = getLotContainer(input.planShape);
  const zones = input.program.programmaticZones;
  const targetM2 = input.program.globalConfig.targetTotalAreaM2;

  if (input.planShape === "l_shape") {
    const mask = buildLotMask(input.planShape, container, targetM2);
    const { placed, warnings, cellOccupancy } = partitionZonesOnMask(
      mask,
      zones,
      input.program,
      { layoutSeed: options.layoutSeed },
    );
    const coverageIssues = verifyLayoutOnMask(mask, placed, cellOccupancy);

    const buildablePx = buildableAreaPx(mask);
    const pxPerMeter = pxPerMeterFromM2PerCell(mask.m2PerCell);
    const occupiedCells = Object.keys(cellOccupancy).length;
    const fillRatio =
      mask.buildableCellCount > 0
        ? occupiedCells / mask.buildableCellCount
        : 0;

    return {
      zones: placed,
      container: { ...container, buildableAreaPx: buildablePx },
      warnings: [
        ...warnings,
        ...coverageIssues,
        "Motor experimental: grilla L",
      ],
      fillRatio,
      mask,
      cellOccupancy,
      pxPerMeter,
    };
  }

  if (input.planShape === "rectangular" || input.planShape === "square") {
    const layout = computeConstraintFloorplanLayout(
      input.program,
      input.planShape,
      { layoutSeed: options.layoutSeed },
    );
    return {
      ...layout,
      warnings: [...layout.warnings, "Motor experimental: constraint treemap"],
    };
  }

  const { placed, warnings } = partitionZonesBsp(container, zones);
  const coverageIssues = verifyLayoutCoverage(container, placed);

  const total = containerArea(container);
  const sum = placed.reduce((s, z) => s + rectArea(z), 0);

  return {
    zones: placed,
    container,
    warnings: [...warnings, ...coverageIssues, "Motor experimental: BSP"],
    fillRatio: total > 0 ? sum / total : 0,
  };
}

function computeTemplateBasedLayout(
  input: FloorplanLayoutInput,
  options: FloorplanLayoutOptions = {},
): FloorplanLayoutResult {
  const { layout } = applyTemplateLayout({
    program: input.program,
    planShape: input.planShape,
    preferences: input.preferences,
    layoutSeed: options.layoutSeed,
  });
  return {
    ...layout,
    planScores: scoreFloorplanLayout(layout, input.program),
  };
}

/**
 * Programa → layout: plantillas curadas por defecto; grilla/treemap solo con flag experimental.
 */
export function computeFloorplanLayout(
  input: FloorplanLayoutInput,
  options?: FloorplanLayoutOptions,
): FloorplanLayoutResult {
  if (isExperimentalGridEngine()) {
    return computeExperimentalLayout(input, options);
  }
  return computeTemplateBasedLayout(input, options);
}

export function computeFloorplanLayoutFromProgram(
  program: ArchitecturalProgram,
  planShape: PlanShape,
  options?: FloorplanLayoutOptions & { preferences?: FloorplanLayoutInput["preferences"] },
): FloorplanLayoutResult {
  return computeFloorplanLayout(
    {
      program,
      planShape,
      preferences: options?.preferences,
    },
    options,
  );
}
