type Props = {
  message: string;
  technicalDetail?: string;
  showTechnical?: boolean;
};

export function FloorPlanResultErrorState({
  message,
  technicalDetail,
  showTechnical = false,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-red-200/90 bg-red-50/80 px-5 py-4"
      role="alert"
    >
      <p className="text-sm font-medium text-red-950">{message}</p>
      {showTechnical && technicalDetail && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white/60 p-2 text-[10px] text-red-900">
          {technicalDetail}
        </pre>
      )}
    </div>
  );
}
