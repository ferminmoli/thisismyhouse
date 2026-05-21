import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import type { FloorplanLayoutResult } from "@/lib/floorplan-layout/types";
import {
  formatRoomCountsForPrompt,
  type UserPreferences,
} from "@/lib/onboarding/user-preferences";

const SHAPE_LABELS: Record<UserPreferences["planShape"], string> = {
  rectangular: "Rectangular",
  square: "Cuadrada",
  l_shape: "En L",
};

type Props = {
  preferences: UserPreferences;
  program: ArchitecturalProgram;
  layout: FloorplanLayoutResult;
  selectedOption?: LayoutVariation;
  warnings?: string[];
  onAnotherLayout: () => void;
  onRegenerate: () => void;
};

export function FloorplanSidebar({
  preferences,
  program,
  layout,
  selectedOption,
  warnings = [],
  onAnotherLayout,
  onRegenerate,
}: Props) {
  const scores = layout.planScores ?? selectedOption?.scores;
  const totalIdealM2 = program.programmaticZones.reduce(
    (s, z) => s + z.idealAreaM2,
    0,
  );
  const targetM2 = program.globalConfig.targetTotalAreaM2;

  return (
    <aside className="w-full shrink-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/60 lg:w-72">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
        Resumen del lote
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-stone-900">
        {program.title}
      </h2>
      {layout.templateMeta && (
        <p className="mt-1 text-xs text-stone-500">
          Plantilla: {layout.templateMeta.templateLabel}
        </p>
      )}

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Superficie objetivo</dt>
          <dd className="font-medium tabular-nums text-stone-900">
            {targetM2.toFixed(1)} m²
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Programa (ideal)</dt>
          <dd className="font-medium tabular-nums text-stone-900">
            {totalIdealM2.toFixed(1)} m²
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Ambientes pedidos</dt>
          <dd className="max-w-[9rem] text-right text-xs font-medium leading-snug text-stone-900">
            {formatRoomCountsForPrompt(preferences.roomCounts)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Zonas en plano</dt>
          <dd className="font-medium text-stone-900">
            {program.programmaticZones.length}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Plantas</dt>
          <dd className="font-medium text-stone-900">
            {preferences.floorCount}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Forma</dt>
          <dd className="font-medium text-stone-900">
            {SHAPE_LABELS[preferences.planShape]}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-stone-500">Cobertura layout</dt>
          <dd className="font-medium tabular-nums text-stone-900">
            {(layout.fillRatio * 100).toFixed(0)}%
          </dd>
        </div>
        {layout.pxPerMeter != null && layout.pxPerMeter > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Escala cotas</dt>
            <dd className="font-medium tabular-nums text-stone-900">
              {layout.pxPerMeter.toFixed(1)} px/m
            </dd>
          </div>
        )}
        {scores && (
          <div className="mt-4 rounded-lg bg-stone-50 px-3 py-2.5 text-xs text-stone-600">
            <p className="font-medium text-stone-800">Calidad conceptual</p>
            <p className="mt-1 tabular-nums">
              Global {(scores.compositeScore * 100).toFixed(0)}% · Circulación{" "}
              {(scores.circulationScore * 100).toFixed(0)}% · Patio{" "}
              {(scores.patioConnectionScore * 100).toFixed(0)}%
            </p>
          </div>
        )}
        {layout.mask && (
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Celdas L habitables</dt>
            <dd className="font-medium tabular-nums text-stone-900">
              {layout.mask.buildableCellCount} /{" "}
              {layout.mask.cols * layout.mask.rows}
            </dd>
          </div>
        )}
      </dl>

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {warnings.slice(0, 3).map((w, i) => (
            <p key={i} className="mt-1 first:mt-0">
              {w}
            </p>
          ))}
        </div>
      )}

      <p className="mt-4 line-clamp-3 text-xs leading-relaxed text-stone-500">
        {preferences.basicNeeds}
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <button
          type="button"
          onClick={onAnotherLayout}
          className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Regenerar opciones A–E
        </button>
        <p className="text-center text-[10px] text-stone-400">
          Mismo programa · nuevas composiciones rankeadas
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          className="w-full rounded-xl border border-stone-300 bg-stone-50 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
        >
          Nuevo brief
        </button>
      </div>
    </aside>
  );
}
