type Props = {
  message?: string;
};

const DEFAULT_MESSAGE =
  "No pudimos generar una planta confiable con estos datos. Probá agregando medidas del lote, orientación y ambientes deseados.";

export function FloorPlanResultEmptyState({
  message = DEFAULT_MESSAGE,
}: Props) {
  return (
    <div
      className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-6 py-12 text-center"
      role="status"
    >
      <p className="text-base font-medium text-stone-800">{message}</p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-500">
        Cuanto más contexto aportes sobre el terreno y el programa, más precisa
        será la propuesta conceptual.
      </p>
    </div>
  );
}
