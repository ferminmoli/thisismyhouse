type Props = {
  title?: string;
  narrative: string;
  bullets?: string[];
  /** Plan-first layout: shorter copy, bullets emphasized. */
  compact?: boolean;
};

export function WhyRecommended({
  title = "¿Por qué este plan?",
  narrative,
  bullets = [],
  compact = false,
}: Props) {
  if (!narrative.trim() && bullets.length === 0) return null;

  const showNarrative =
    narrative.trim().length > 0 && (!compact || narrative.length < 220);

  return (
    <section
      className={
        compact
          ? "space-y-3"
          : "rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm shadow-stone-200/40"
      }
      aria-labelledby="why-plan-title"
    >
      <h2 id="why-plan-title" className="text-sm font-semibold text-stone-900">
        {title}
      </h2>
      {showNarrative && (
        <p className="mt-2 text-sm leading-relaxed text-stone-700">{narrative}</p>
      )}
      {bullets.length > 0 && (
        <ul
          className={
            compact
              ? "mt-2 space-y-2"
              : "mt-4 space-y-2 border-t border-stone-100 pt-4"
          }
        >
          {bullets.map((reason, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-sm leading-relaxed text-stone-600"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-400"
                aria-hidden
              />
              {reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
