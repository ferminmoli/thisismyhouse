import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { PlanShape } from "@/lib/onboarding/user-preferences";
import {
  buildLotMask,
  buildableAreaPx,
} from "@/lib/floorplan-layout/lot-mask";
import { pxPerMeterFromM2PerCell } from "@/lib/floorplan-layout/grid-scale";
import { rectArea } from "@/lib/floorplan-layout/geometry";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import { mapProgramToTemplate } from "./map-program-to-template";
import { selectArchitecturalTemplate } from "./select-template";
import type { ArchitecturalTemplate, TemplateLayoutMeta } from "./types";
import { validateTemplateLayout } from "./validate-template-layout";
import {
  applyTemplateVariant,
  variantFromSeed,
  type TemplateVariantId,
} from "./template-variants";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";

function snap(n: number): number {
  return Math.round(n);
}

function buildZonesFromTemplate(
  template: ArchitecturalTemplate,
  program: ArchitecturalProgram,
  layoutSeed: number,
): {
  zones: PlacedZoneRect[];
  mapping: ReturnType<typeof mapProgramToTemplate>;
} {
  const mapping = mapProgramToTemplate(program, template, layoutSeed);
  const zoneById = Object.fromEntries(
    program.programmaticZones.map((z) => [z.id, z]),
  );
  const slotById = Object.fromEntries(
    template.slots.map((s) => [s.slotId, s]),
  );

  const zones: PlacedZoneRect[] = [];
  for (const a of mapping.assignments) {
    const slot = slotById[a.slotId];
    const zone = zoneById[a.zoneId];
    if (!slot || !zone) continue;
    zones.push({
      id: zone.id,
      label: zone.label.trim() || a.zoneLabel,
      type: zone.type,
      x: snap(slot.x),
      y: snap(slot.y),
      width: snap(slot.width),
      height: snap(slot.height),
    });
  }

  return { zones, mapping };
}

function ignoredSoftAdjacencies(
  template: ArchitecturalTemplate,
  assignments: { slotId: string }[],
) {
  const filled = new Set(assignments.map((a) => a.slotId));
  return template.softAdjacencies.filter(
    (adj) => !filled.has(adj.fromSlotId) || !filled.has(adj.toSlotId),
  );
}

export type ApplyTemplateLayoutInput = {
  program: ArchitecturalProgram;
  planShape: PlanShape;
  preferences?: UserPreferences;
  layoutSeed?: number;
  variantId?: TemplateVariantId;
  selectionReasonSuffix?: string;
};

export type ApplyTemplateLayoutOutput = {
  layout: FloorplanLayoutResult;
  meta: TemplateLayoutMeta;
};

export function applyTemplateLayout(
  input: ApplyTemplateLayoutInput,
): ApplyTemplateLayoutOutput {
  const layoutSeed = input.layoutSeed ?? 1;
  const { template: baseTemplate, reason: baseReason } =
    selectArchitecturalTemplate(
      input.program,
      input.planShape,
      input.preferences,
    );
  const variantId =
    input.variantId ?? variantFromSeed(baseTemplate.id, layoutSeed);
  const template = applyTemplateVariant(baseTemplate, variantId);
  const reason = input.selectionReasonSuffix
    ? `${baseReason} · ${input.selectionReasonSuffix}`
    : baseReason;

  const { zones, mapping } = buildZonesFromTemplate(
    template,
    input.program,
    layoutSeed,
  );

  const validation = validateTemplateLayout(template, zones, mapping.assignments);
  const softIgnored = ignoredSoftAdjacencies(template, mapping.assignments);

  const targetM2 = input.program.globalConfig.targetTotalAreaM2;
  const container = {
    shape: template.shape,
    x: 0,
    y: 0,
    width: template.canvas.width,
    height: template.canvas.height,
  };

  let mask: FloorplanLayoutResult["mask"];
  let pxPerMeter: number | undefined;
  let buildablePx: number;

  if (template.shape === "l_shape" && template.lVoidUpperRight) {
    mask = buildLotMask("l_shape", container, targetM2);
    buildablePx = buildableAreaPx(mask);
    pxPerMeter = pxPerMeterFromM2PerCell(mask.m2PerCell);
  } else {
    const slotArea = template.slots.reduce(
      (s, sl) => s + sl.width * sl.height,
      0,
    );
    buildablePx = slotArea;
    const widthM = Math.sqrt(
      targetM2 * (container.width / container.height),
    );
    pxPerMeter =
      widthM > 0 ? container.width / widthM : 10;
  }

  const placedArea = zones.reduce((s, z) => s + rectArea(z), 0);
  const fillRatio =
    buildablePx > 0
      ? placedArea / buildablePx
      : placedArea / (container.width * container.height);

  const warnings = [
    `Motor: plantilla ${template.id}`,
    ...mapping.warnings,
    ...validation.warnings,
    ...(validation.overlaps.length
      ? validation.overlaps.map((o) => `Solape: ${o.a} ↔ ${o.b}`)
      : []),
    ...(validation.outOfBounds.length
      ? validation.outOfBounds.map((id) => `Fuera de lote: ${id}`)
      : []),
    ...(mapping.unmappedZoneIds.length
      ? [`Sin mapear: ${mapping.unmappedZoneIds.join(", ")}`]
      : []),
  ];

  const meta: TemplateLayoutMeta = {
    templateId: template.id,
    templateLabel: template.label,
    selectionReason: reason,
    mappedRooms: mapping.assignments,
    unmappedRooms: mapping.unmappedZoneIds,
    ignoredSoftAdjacencies: softIgnored,
    validation,
  };

  const layout: FloorplanLayoutResult = {
    zones,
    container: { ...container, buildableAreaPx: buildablePx },
    warnings,
    fillRatio,
    mask,
    pxPerMeter,
    templateMeta: meta,
  };

  return { layout, meta };
}
