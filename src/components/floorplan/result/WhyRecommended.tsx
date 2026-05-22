type Props = {
  reasons: string[];
  title?: string;
};

export function WhyRecommended({
  reasons,
  title = "¿Por qué este plan?",
}: Props) {
  if (!reasons.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">
        Por qué recomendamos esta variante según tu brief.
      </p>
      <ul className="mt-4 space-y-3">
        {reasons.map((reason, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl bg-slate-50/90 px-3 py-3 text-sm leading-relaxed text-slate-700"
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white"
              aria-hidden
            >
              {i + 1}
            </span>
            {reason}
          </li>
        ))}
      </ul>
    </section>
  );
}
