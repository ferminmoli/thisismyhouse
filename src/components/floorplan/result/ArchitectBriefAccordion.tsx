"use client";

import type { ArchitectBrief } from "@/lib/architecture/floorPlanPipelineTypes";
import { useId, useState } from "react";

type Props = {
  brief: ArchitectBrief;
  defaultOpen?: boolean;
};

export function ArchitectBriefAccordion({
  brief,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <h2 className="sr-only">Brief para arquitecto</h2>
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-testid="architect-brief-toggle"
        aria-label="Brief para arquitecto, expandir o contraer"
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <span className="text-sm font-semibold text-slate-900">
          Brief para arquitecto
        </span>
        <span className="text-xs text-slate-500" aria-hidden>
          {open ? "Ocultar" : "Ver detalle"}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="space-y-6 border-t border-slate-100 px-5 py-5 text-sm text-slate-700"
        >
          <BriefBlock title="Resumen del proyecto" body={brief.projectSummary} />
          <BriefBlock title="Concepto recomendado" body={brief.recommendedConcept} />
          <BriefList
            title="Programa"
            items={[
              brief.program.coveredAreaTargetM2 != null
                ? `Superficie cubierta objetivo: ~${brief.program.coveredAreaTargetM2} m²`
                : null,
              brief.program.outdoorAreaTargetM2 != null
                ? `Exterior objetivo: ~${brief.program.outdoorAreaTargetM2} m²`
                : null,
              ...brief.program.rooms,
            ].filter((x): x is string => Boolean(x))}
          />
          <BriefList title="Estrategia espacial" items={brief.spatialStrategy} />
          <BriefList title="Adjacencias clave" items={brief.keyAdjacencies} />
          <BriefList title="Núcleo de servicios" items={brief.serviceCoreNotes} />
          <BriefList
            title="Luz y ventilación"
            items={brief.daylightAndVentilationNotes}
          />
          {brief.unresolvedQuestions.length > 0 && (
            <BriefList title="Preguntas abiertas" items={brief.unresolvedQuestions} />
          )}
          <BriefList
            title="Validación profesional"
            items={brief.professionalValidationRequired}
          />
        </div>
      )}
    </section>
  );
}

function BriefBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <p className="mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
