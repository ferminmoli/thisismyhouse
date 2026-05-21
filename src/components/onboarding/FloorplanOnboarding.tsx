"use client";

import {
  createUserPreferences,
  ONBOARDING_QUICK_TEST_DEFAULTS,
  shouldAssumeM2FromSqft,
  SQFT_ASSUME_M2_MESSAGE,
  SQFT_ASSUME_M2_THRESHOLD,
  type AreaUnit,
  type FloorCount,
  type PlanShape,
  type RoomCounts,
  type UserPreferences,
} from "@/lib/onboarding/user-preferences";
import { useEffect, useState } from "react";

const STEPS = [
  { id: "needs", title: "Necesidades", subtitle: "¿Quién vivirá en la casa?" },
  {
    id: "rooms",
    title: "Ambientes",
    subtitle: "Cantidad por tipo (como en Maket)",
  },
  { id: "floors", title: "Plantas", subtitle: "¿Cuántos niveles querés?" },
  { id: "size", title: "Tamaño", subtitle: "Superficie aproximada del espacio" },
  { id: "shape", title: "Forma del lote", subtitle: "Silueta general del plano" },
] as const;

const FLOOR_OPTIONS: { value: FloorCount; label: string }[] = [
  { value: 1, label: "1 planta" },
  { value: 2, label: "2 plantas" },
];

/** Orden: Rectangular → Cuadrada → En L */
const SHAPE_OPTIONS: { value: PlanShape; label: string }[] = [
  { value: "rectangular", label: "Rectangular" },
  { value: "square", label: "Cuadrada" },
  { value: "l_shape", label: "En L" },
];

function ShapePreview({ shape }: { shape: PlanShape }) {
  const fill = "fill-stone-700/85";
  if (shape === "rectangular") {
    return (
      <svg viewBox="0 0 56 40" className="h-12 w-16" aria-hidden>
        <rect x="6" y="8" width="44" height="24" rx="2" className={fill} />
      </svg>
    );
  }
  if (shape === "square") {
    return (
      <svg viewBox="0 0 56 40" className="h-12 w-16" aria-hidden>
        <rect x="14" y="6" width="28" height="28" rx="2" className={fill} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 40" className="h-12 w-16" aria-hidden>
      <path d="M8 8h32v14H20v10H8V8z" className={fill} />
    </svg>
  );
}

const ROOM_FIELDS: {
  key: keyof RoomCounts;
  label: string;
  max: number;
}[] = [
  { key: "bedrooms", label: "Dormitorios", max: 6 },
  { key: "bathrooms", label: "Baños", max: 4 },
  { key: "kitchens", label: "Cocinas", max: 2 },
  { key: "living", label: "Living / comedor", max: 2 },
  { key: "patio", label: "Patio / exterior", max: 2 },
  { key: "garage", label: "Cochera", max: 2 },
];

function RoomCountRow({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50/50 px-4 py-3">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Menos ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-lg leading-none text-stone-700 transition hover:bg-stone-100 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center text-base font-semibold tabular-nums text-stone-900">
          {value}
        </span>
        <button
          type="button"
          aria-label={`Más ${label}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-lg leading-none text-stone-700 transition hover:bg-stone-100 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

function FloatingNotice({
  message,
  visible,
}: {
  message: string;
  visible: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute left-0 right-0 top-full z-10 mt-3 flex justify-center transition-all duration-300 ease-out ${
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-1 opacity-0"
      }`}
    >
      <p className="max-w-sm rounded-xl border border-stone-200/90 bg-white px-4 py-2.5 text-center text-sm leading-snug text-stone-700 shadow-lg shadow-stone-200/50">
        {message}
      </p>
    </div>
  );
}

export type FloorplanOnboardingProps = {
  onComplete: (preferences: UserPreferences) => void;
  onSkip?: () => void;
  className?: string;
};

export function FloorplanOnboarding({
  onComplete,
  onSkip,
  className = "",
}: FloorplanOnboardingProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const [basicNeeds, setBasicNeeds] = useState(
    ONBOARDING_QUICK_TEST_DEFAULTS.basicNeeds,
  );
  const [roomCounts, setRoomCounts] = useState<RoomCounts>({
    ...ONBOARDING_QUICK_TEST_DEFAULTS.roomCounts,
  });
  const [floorCount, setFloorCount] = useState<FloorCount | null>(
    ONBOARDING_QUICK_TEST_DEFAULTS.floorCount,
  );
  const [lotValue, setLotValue] = useState(ONBOARDING_QUICK_TEST_DEFAULTS.lotValue);
  const [lotUnit, setLotUnit] = useState<AreaUnit>(
    ONBOARDING_QUICK_TEST_DEFAULTS.lotUnit,
  );
  const [showUnitNotice, setShowUnitNotice] = useState(false);
  const [planShape, setPlanShape] = useState<PlanShape | null>(
    ONBOARDING_QUICK_TEST_DEFAULTS.planShape,
  );

  const parsedLot = parseFloat(lotValue.replace(",", "."));

  useEffect(() => {
    if (!Number.isFinite(parsedLot) || parsedLot <= 0) {
      setShowUnitNotice(false);
      return;
    }
    if (lotUnit === "sqft" && parsedLot < SQFT_ASSUME_M2_THRESHOLD) {
      setLotUnit("m2");
      setShowUnitNotice(true);
      return;
    }
    if (parsedLot >= SQFT_ASSUME_M2_THRESHOLD) {
      setShowUnitNotice(false);
    }
  }, [parsedLot, lotUnit]);

  useEffect(() => {
    if (!showUnitNotice) return;
    const t = window.setTimeout(() => setShowUnitNotice(false), 4500);
    return () => window.clearTimeout(t);
  }, [showUnitNotice]);

  function handleUnitToggle(next: AreaUnit) {
    setLotUnit(next);
  }

  const effectiveUnit = lotUnit;

  const totalRooms =
    roomCounts.bedrooms +
    roomCounts.bathrooms +
    roomCounts.kitchens +
    roomCounts.living;

  const canNext = (() => {
    switch (step) {
      case 0:
        return basicNeeds.trim().length >= 8;
      case 1:
        return totalRooms >= 1;
      case 2:
        return floorCount !== null;
      case 3:
        return Number.isFinite(parsedLot) && parsedLot > 0;
      case 4:
        return planShape !== null;
      default:
        return false;
    }
  })();

  function goNext() {
    if (!canNext) return;
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
      return;
    }
    if (floorCount === null || planShape === null) return;

    const unitForPrefs =
      shouldAssumeM2FromSqft(parsedLot, lotUnit) ? "m2" : lotUnit;

    onComplete(
      createUserPreferences({
        basicNeeds,
        roomCounts,
        floorCount,
        lotValue: parsedLot,
        lotUnit: unitForPrefs,
        planShape,
      }),
    );
  }

  function goBack() {
    if (step === 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  const selectedCard =
    "border-stone-800 bg-stone-50 ring-2 ring-stone-800/15 shadow-sm";
  const idleCard =
    "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50";

  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white/95 shadow-sm ring-1 ring-stone-200/70 ${className}`}
      aria-label="Asistente de preferencias del plano"
    >
      <div className="border-b border-stone-100 px-6 pb-5 pt-7 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">
              Paso {step + 1} de {STEPS.length}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              {STEPS[step].title}
            </h2>
            <p className="mt-1 text-sm text-stone-500">{STEPS[step].subtitle}</p>
          </div>
        </div>

        <div
          className="mt-6 h-0.5 overflow-hidden rounded-full bg-stone-100"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          <div
            className="h-full rounded-full bg-stone-800 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <nav className="mt-5 flex gap-1" aria-label="Progreso del asistente">
          {STEPS.map((s, i) => (
            <span
              key={s.id}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-stone-800" : "bg-stone-200"
              }`}
            />
          ))}
        </nav>
      </div>

      <div className="relative min-h-[260px] px-6 py-8 sm:min-h-[280px] sm:px-8">
        <div
          key={step}
          className={`onboarding-step-enter ${
            direction === 1 ? "onboarding-from-right" : "onboarding-from-left"
          }`}
        >
          {step === 0 && (
            <div className="space-y-3">
              <label htmlFor="basic-needs" className="sr-only">
                Necesidades básicas
              </label>
              <textarea
                id="basic-needs"
                rows={4}
                value={basicNeeds}
                onChange={(e) => setBasicNeeds(e.target.value)}
                placeholder='Ej: "Casa para dos personas y un bebé con oficina"'
                className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50/40 px-4 py-3.5 text-[15px] leading-relaxed text-stone-800 placeholder:text-stone-400 transition-[border-color,box-shadow] duration-200 focus:border-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200/80"
                autoFocus
              />
              <p className="text-xs text-stone-400">
                Mínimo 8 caracteres. Valores de prueba precargados — tocá Continuar
                en cada paso.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-md space-y-2">
              {ROOM_FIELDS.map((f) => (
                <RoomCountRow
                  key={f.key}
                  label={f.label}
                  value={roomCounts[f.key]}
                  max={f.max}
                  onChange={(n) =>
                    setRoomCounts((c) => ({ ...c, [f.key]: n }))
                  }
                />
              ))}
              <p className="pt-2 text-xs text-stone-400">
                Al menos un dormitorio, baño, cocina o living. Patio y cochera
                son opcionales.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              {FLOOR_OPTIONS.map((opt) => {
                const selected = floorCount === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFloorCount(opt.value)}
                    className={`rounded-2xl border px-5 py-6 text-center transition-all duration-200 ${
                      selected ? selectedCard : idleCard
                    }`}
                  >
                    <span
                      className={`text-lg font-semibold tracking-tight ${
                        selected ? "text-stone-900" : "text-stone-700"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-sm space-y-4">
              <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50/60 p-1">
                {(["m2", "sqft"] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleUnitToggle(u)}
                    className={`rounded-lg px-5 py-2 text-sm font-medium transition-all duration-200 ${
                      effectiveUnit === u
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-700"
                    }`}
                  >
                    {u === "m2" ? "m²" : "sq ft"}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="decimal"
                  value={lotValue}
                  onChange={(e) => setLotValue(e.target.value)}
                  placeholder={effectiveUnit === "m2" ? "Ej: 120" : "Ej: 1300"}
                  className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 py-4 pl-4 pr-14 text-2xl font-semibold tabular-nums tracking-tight text-stone-900 transition-[border-color,box-shadow] duration-200 focus:border-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-200/80"
                  autoFocus
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">
                  {effectiveUnit === "m2" ? "m²" : "sqft"}
                </span>
                <FloatingNotice
                  message={SQFT_ASSUME_M2_MESSAGE}
                  visible={showUnitNotice}
                />
              </div>

              <p className="text-xs text-stone-400">
                Valores menores a {SQFT_ASSUME_M2_THRESHOLD} en sq ft se interpretan
                como m².
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {SHAPE_OPTIONS.map((opt) => {
                const selected = planShape === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPlanShape(opt.value)}
                    className={`flex flex-col items-center rounded-2xl border px-3 py-5 transition-all duration-200 ${
                      selected ? selectedCard : idleCard
                    }`}
                  >
                    <div
                      className={`mb-3 flex h-[4.5rem] w-full items-center justify-center rounded-xl transition-colors duration-200 ${
                        selected ? "bg-stone-200/50" : "bg-stone-100/70"
                      }`}
                    >
                      <ShapePreview shape={opt.value} />
                    </div>
                    <span className="text-sm font-semibold text-stone-900">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-stone-100 px-6 py-5 sm:px-8">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-500 transition-colors duration-200 hover:bg-stone-100 hover:text-stone-800"
          >
            Atrás
          </button>
        ) : onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-400 transition hover:text-stone-600"
          >
            Omitir
          </button>
        ) : (
          <span aria-hidden />
        )}

        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="rounded-xl bg-stone-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-35"
        >
          {step < STEPS.length - 1 ? "Continuar" : "Finalizar"}
        </button>
      </div>
    </section>
  );
}
