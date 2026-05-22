"use client";

export type PlanRendererTab = "actual" | "arcada";

type Props = {
  active: PlanRendererTab;
  onChange: (tab: PlanRendererTab) => void;
};

export function PlanRendererTabs({ active, onChange }: Props) {
  return (
    <div
      className="mb-3 flex flex-wrap items-center gap-2"
      role="tablist"
      aria-label="Vista del plano"
      data-testid="plan-renderer-tabs"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "actual"}
        data-testid="plan-tab-actual"
        className={
          active === "actual"
            ? "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm"
            : "rounded-lg border border-transparent bg-stone-100/80 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
        }
        onClick={() => onChange("actual")}
      >
        Plano actual
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "arcada"}
        data-testid="plan-tab-arcada"
        className={
          active === "arcada"
            ? "rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-900 shadow-sm"
            : "rounded-lg border border-transparent bg-stone-100/80 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-100"
        }
        onClick={() => onChange("arcada")}
      >
        Arcada POC
      </button>
      <span
        className="rounded-md border border-amber-200/90 bg-amber-50/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900"
        data-testid="arcada-poc-badge"
      >
        Experimental
      </span>
    </div>
  );
}
