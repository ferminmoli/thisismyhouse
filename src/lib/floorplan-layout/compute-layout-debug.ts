import {
  createPipelineTrace,
  summarizeLayout,
  summarizeProgram,
} from "@/lib/pipeline-debug";
import { isExperimentalGridEngine } from "@/lib/architectural-templates/config";
import { selectArchitecturalTemplate } from "@/lib/architectural-templates/select-template";
import {
  computeFloorplanLayout,
  type FloorplanLayoutOptions,
} from "./compute-layout";
import type { FloorplanLayoutInput, FloorplanLayoutResult } from "./types";

export function computeFloorplanLayoutWithDebug(
  input: FloorplanLayoutInput,
  options: FloorplanLayoutOptions = {},
): {
  layout: FloorplanLayoutResult;
  debugTrace: ReturnType<typeof createPipelineTrace>["trace"];
} {
  const { trace, push, finish } = createPipelineTrace();
  const experimental = isExperimentalGridEngine();

  push({
    id: "layout_input",
    phase: "layout",
    label: "Entrada al motor geométrico",
    output: {
      planShape: input.planShape,
      layoutSeed: options.layoutSeed ?? null,
      engine: experimental ? "experimental_grid" : "architectural_template",
      program: summarizeProgram(input.program),
    },
  });

  if (!experimental && input.preferences) {
    const selection = selectArchitecturalTemplate(
      input.program,
      input.planShape,
      input.preferences,
    );
    push({
      id: "template_selection",
      phase: "layout",
      label: "Plantilla arquitectónica",
      output: {
        templateId: selection.template.id,
        templateLabel: selection.template.label,
        reason: selection.reason,
        slotCount: selection.template.slots.length,
      },
    });
  }

  const part0 = Date.now();
  const layout = computeFloorplanLayout(input, options);

  if (layout.templateMeta) {
    const m = layout.templateMeta;
    push({
      id: "template_mapping",
      phase: "layout",
      label: "Mapeo programa → slots",
      status: m.unmappedRooms.length > 0 ? "warn" : "ok",
      output: {
        templateId: m.templateId,
        selectionReason: m.selectionReason,
        mappedRooms: m.mappedRooms.map((r) => ({
          zoneId: r.zoneId,
          slotId: r.slotId,
          type: r.zoneType,
        })),
        unmappedRooms: m.unmappedRooms,
        ignoredSoftAdjacencies: m.ignoredSoftAdjacencies.map(
          (a) => `${a.fromSlotId}↔${a.toSlotId}`,
        ),
      },
      messages: layout.warnings,
    });

    push({
      id: "template_validation",
      phase: "layout",
      label: "Validación ligera",
      status: m.validation.ok ? "ok" : "warn",
      output: {
        ok: m.validation.ok,
        overlaps: m.validation.overlaps,
        outOfBounds: m.validation.outOfBounds,
        emptySlots: m.validation.missingMappings,
        invalidDoorRefs: m.validation.invalidDoorRefs,
      },
      messages: m.validation.warnings,
    });
  }

  push({
    id: "layout_partition",
    phase: "layout",
    label: experimental
      ? "Partición experimental"
      : `Plantilla ${layout.templateMeta?.templateId ?? "?"}`,
    durationMs: Date.now() - part0,
    status: layout.warnings.length > 0 ? "warn" : "ok",
    output: summarizeLayout(layout),
    messages: layout.warnings,
  });

  push({
    id: "layout_verify",
    phase: "layout",
    label: "Resultado layout",
    status: layout.warnings.length > 0 ? "warn" : "ok",
    output: summarizeLayout(layout),
    messages: layout.warnings,
  });

  finish();
  return { layout, debugTrace: trace };
}

export function computeFloorplanLayoutFromProgramWithDebug(
  program: FloorplanLayoutInput["program"],
  planShape: FloorplanLayoutInput["planShape"],
  options?: FloorplanLayoutOptions & {
    preferences?: FloorplanLayoutInput["preferences"];
  },
) {
  return computeFloorplanLayoutWithDebug(
    {
      program,
      planShape,
      preferences: options?.preferences,
    },
    options,
  );
}
