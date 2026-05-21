type Props = {
  title: string;
  subtitle?: string;
};

export function FloorplanLoader({ title, subtitle }: Props) {
  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-white/90 px-8 py-14 shadow-sm ring-1 ring-stone-200/60"
      role="status"
      aria-live="polite"
    >
      <span
        className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-stone-300 border-t-stone-800"
        aria-hidden
      />
      <p className="mt-6 max-w-md text-center text-sm font-medium text-stone-800">
        {title}
      </p>
      {subtitle && (
        <p className="mt-2 max-w-sm text-center text-xs text-stone-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
