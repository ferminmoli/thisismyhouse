"use client";

import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import type { UserFacingExplanation } from "@/lib/ai-prompts/user-explanation-types";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { useEffect, useState } from "react";

type Props = {
  variation: LayoutVariation;
  program: ArchitecturalProgram;
  preferences: UserPreferences;
};

export function FloorplanOptionExplanation({
  variation,
  program,
  preferences,
}: Props) {
  const [explanation, setExplanation] = useState<UserFacingExplanation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"gemini" | "local" | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setExplanation(null);

    (async () => {
      try {
        const res = await fetch("/api/user-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            variation,
            program,
            userPreferences: preferences,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && data.explanation) {
          setExplanation(data.explanation);
          setSource(data.source ?? "local");
        }
      } catch {
        if (!cancelled) setExplanation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [variation.optionId, program, preferences]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200/80 bg-white/90 px-5 py-4 text-sm text-stone-500">
        Preparando explicación de {variation.label}…
      </div>
    );
  }

  if (!explanation) return null;

  return (
    <article className="rounded-2xl border border-stone-200/80 bg-gradient-to-br from-white to-stone-50/90 px-5 py-5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
        Por qué esta opción
        {source === "local" && (
          <span className="ml-2 normal-case tracking-normal text-stone-400">
            · guía local
          </span>
        )}
      </p>
      <h3 className="mt-2 text-lg font-semibold tracking-tight text-stone-900">
        {explanation.headline}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {explanation.shortSummary}
      </p>

      {explanation.whyItFits.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Por qué encaja
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
            {explanation.whyItFits.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-stone-400">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.tradeoffs.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            A tener en cuenta
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-stone-600">
            {explanation.tradeoffs.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-500">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explanation.questionsForArchitect.length > 0 && (
        <div className="mt-4 rounded-lg bg-stone-100/80 px-3 py-3">
          <p className="text-xs font-semibold text-stone-700">
            Preguntas para tu arquitecto
          </p>
          <ul className="mt-2 space-y-1 text-xs text-stone-600">
            {explanation.questionsForArchitect.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-snug text-stone-400">
        {explanation.disclaimer}
      </p>
    </article>
  );
}
