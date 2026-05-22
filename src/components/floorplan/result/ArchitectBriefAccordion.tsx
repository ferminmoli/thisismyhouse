"use client";

import type { PublicArchitectBrief } from "@/lib/architecture/floorPlanPipelineTypes";
import { useId, useState } from "react";

type Props = {
  brief: PublicArchitectBrief;
  selectedVariantLabel?: string;
  professionalChecks?: string[];
  defaultOpen?: boolean;
};

export function ArchitectBriefAccordion({
  brief,
  selectedVariantLabel,
  professionalChecks = [],
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  const roomLines = brief.rooms
    .map((r) => {
      const m2 =
        r.estimatedAreaM2 != null
          ? ` · ~${Math.round(r.estimatedAreaM2)} m²`
          : "";
      return `${r.label}${m2}`;
    })
    .filter(Boolean);

  const areaLines = [
    brief.areas.coveredM2 != null
      ? `Cubierto estimado: ~${Math.round(brief.areas.coveredM2)} m²`
      : null,
    brief.areas.outdoorM2 != null
      ? `Exterior estimado: ~${Math.round(brief.areas.outdoorM2)} m²`
      : null,
    brief.areas.semiCoveredM2 != null
      ? `Semi-cubierto: ~${Math.round(brief.areas.semiCoveredM2)} m²`
      : null,
    brief.areas.totalM2 != null
      ? `Total programa: ~${Math.round(brief.areas.totalM2)} m²`
      : null,
  ].filter((x): x is string => Boolean(x));

  return (
    <section className="rounded-2xl border border-stone-200/90 bg-white shadow-sm">
      <h2 className="sr-only">Brief para revisar con un arquitecto</h2>
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        data-testid="architect-brief-toggle"
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
      >
        <span className="text-sm font-semibold text-stone-900">
          Brief para revisar con un arquitecto
        </span>
        <span className="text-xs text-stone-500" aria-hidden>
          {open ? "Ocultar" : "Ver detalle"}
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          data-testid="architect-brief-panel"
          className="space-y-5 border-t border-stone-100 px-5 py-5 text-sm text-stone-700"
        >
          <p className="text-xs leading-relaxed text-stone-500">
            Resumen para llevar a una reunión profesional. Las superficies son
            estimadas; no constituyen medidas de obra.
          </p>
          {brief.summary?.trim() && (
            <BriefBlock title="Resumen del programa" body={brief.summary} />
          )}
          {selectedVariantLabel?.trim() && (
            <BriefBlock title="Variante mostrada" body={selectedVariantLabel} />
          )}
          <BriefList title="Decisiones clave" items={brief.keyDecisions} />
          <BriefList title="Superficies estimadas" items={areaLines} />
          <BriefList title="Ambientes" items={roomLines} />
          <BriefList
            title="Qué validar profesionalmente"
            items={professionalChecks}
          />
          <BriefList title="Advertencias y supuestos" items={brief.warnings} />
          <BriefList title="Próximos pasos" items={brief.nextSteps} />
        </div>
      )}
    </section>
  );
}

function BriefBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h3>
      <p className="mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  const filtered = items.filter((item) => item?.trim());
  if (!filtered.length) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {filtered.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
