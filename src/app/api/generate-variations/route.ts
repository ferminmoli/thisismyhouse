import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import {
  generateLayoutVariationsAsync,
  type LayoutVariation,
} from "@/lib/floorplan-layout/generate-layout-variations";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { NextRequest, NextResponse } from "next/server";

function isProgram(v: unknown): v is ArchitecturalProgram {
  if (!v || typeof v !== "object") return false;
  const o = v as ArchitecturalProgram;
  return (
    Array.isArray(o.programmaticZones) &&
    o.programmaticZones.length > 0 &&
    o.globalConfig?.targetTotalAreaM2 > 0
  );
}

function isPreferences(v: unknown): v is UserPreferences {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const rc = o.roomCounts;
  return (
    typeof o.basicNeeds === "string" &&
    rc != null &&
    typeof (rc as { bedrooms?: number }).bedrooms === "number" &&
    o.lotSize != null &&
    typeof (o.lotSize as { areaM2?: number }).areaM2 === "number" &&
    typeof o.planShape === "string"
  );
}

/** Serializa variaciones para el cliente (sin funciones). */
function serializeVariations(variations: LayoutVariation[]) {
  return variations.map((v) => ({
    optionId: v.optionId,
    label: v.label,
    description: v.description,
    strategy: v.strategy,
    strategyId: v.strategyId,
    variantId: v.variantId,
    layout: v.layout,
    scores: v.scores,
  }));
}

export async function POST(request: NextRequest) {
  let body: {
    program?: unknown;
    userPreferences?: unknown;
    maxOptions?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!isProgram(body.program) || !isPreferences(body.userPreferences)) {
    return NextResponse.json(
      { ok: false, error: "Faltan program y userPreferences" },
      { status: 400 },
    );
  }

  const prefs = body.userPreferences;
  const result = await generateLayoutVariationsAsync({
    program: body.program,
    planShape: prefs.planShape,
    preferences: prefs,
    maxOptions: body.maxOptions ?? 5,
  });

  return NextResponse.json({
    ok: true,
    variations: serializeVariations(result.variations),
    strategiesSource: result.strategiesSource,
    strategiesModel: result.strategiesModel,
    strategiesWarning: result.strategiesError,
    critic: result.critic,
    criticSource: result.criticSource,
    criticModel: result.criticModel,
    criticWarning: result.criticError,
    repairLog: result.repairLog,
  });
}
