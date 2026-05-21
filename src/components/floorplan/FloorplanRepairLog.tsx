"use client";

import type { RepairLogEntry } from "@/lib/floorplan-layout/generate-layout-variations";

type Props = {
  entries: RepairLogEntry[];
};

export function FloorplanRepairLog({ entries }: Props) {
  const notable = entries.filter(
    (e) => e.repair.repairPriority !== "low" || !e.recovered,
  );
  if (notable.length === 0) return null;

  return (
    <details className="rounded-2xl border border-amber-200/70 bg-amber-50/50 px-5 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-amber-950">
        Ajustes automáticos del motor ({notable.length})
      </summary>
      <ul className="mt-3 space-y-3 text-xs text-amber-950/90">
        {notable.map((e) => (
          <li key={e.strategyId} className="rounded-lg bg-white/70 px-3 py-2">
            <span className="font-semibold">{e.strategyLabel}</span>
            {" — "}
            {e.recovered ? (
              <span className="text-emerald-700">recuperada</span>
            ) : (
              <span className="text-amber-800">sin recuperar</span>
            )}
            <p className="mt-1 text-stone-600">
              Prioridad {e.repair.repairPriority}
              {e.repair.templateHints.length > 0 &&
                ` · variantes: ${e.repair.templateHints.join(", ")}`}
            </p>
            {e.repair.strategyAdjustments[0] && (
              <p className="mt-1">{e.repair.strategyAdjustments[0]}</p>
            )}
            {e.repair.discardReason && (
              <p className="mt-1 text-amber-800">{e.repair.discardReason}</p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
