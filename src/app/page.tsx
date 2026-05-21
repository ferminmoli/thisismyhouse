"use client";

import { FloorplanApp } from "@/components/floorplan/FloorplanApp";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F7F2EC] text-stone-800">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="mb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-800/80">
            Arc POC
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Planta procedural con IA
          </h1>
          <p className="mt-3 max-w-xl text-stone-600">
            Flujo Maket: onboarding → programa IA → plantillas curadas → plano
            conceptual con muros, aberturas, mobiliario y cotas.
          </p>
        </header>

        <FloorplanApp />
      </div>
    </div>
  );
}
