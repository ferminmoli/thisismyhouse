type Props = {
  highlights: string[];
  title?: string;
};

export function PlanHighlights({
  highlights,
  title = "Aspectos destacados",
}: Props) {
  if (!highlights.length) return null;

  return (
    <section aria-labelledby="plan-highlights-title">
      <h2
        id="plan-highlights-title"
        className="text-sm font-semibold text-stone-900"
      >
        {title}
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {highlights.map((text, i) => (
          <li
            key={i}
            className="rounded-xl border border-stone-200/90 bg-white px-3.5 py-3 text-sm leading-snug text-stone-700 shadow-sm shadow-stone-100/50"
          >
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
}
