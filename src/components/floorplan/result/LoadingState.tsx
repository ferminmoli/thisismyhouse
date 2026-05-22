export function FloorPlanResultLoadingState() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Generando planta conceptual"
    >
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-8 w-2/3 max-w-md animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
      </div>
      <div className="aspect-square max-h-[420px] w-full animate-pulse rounded-2xl bg-slate-100 ring-1 ring-slate-200/80" />
      <p className="text-center text-sm text-slate-600">
        Generando tu planta conceptual…
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
