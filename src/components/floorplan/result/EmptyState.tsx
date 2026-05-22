type Props = {
  message?: string;
};

export function FloorPlanResultEmptyState({
  message = "Todavía no hay un resultado de planta disponible.",
}: Props) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-800">{message}</p>
      <p className="mt-2 max-w-sm text-xs text-slate-500">
        Completá el brief inicial para generar conceptos.
      </p>
    </div>
  );
}
