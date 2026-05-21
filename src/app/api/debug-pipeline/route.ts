import { generateArchitecturalProgram } from "@/lib/architectural-program";
import { computeFloorplanLayoutFromProgramWithDebug } from "@/lib/floorplan-layout/compute-layout-debug";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { mergeTraces } from "@/lib/pipeline-debug";
import { NextRequest, NextResponse } from "next/server";

function isUserPreferences(v: unknown): v is UserPreferences {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const rc = o.roomCounts;
  const roomCountsOk =
    rc != null &&
    typeof rc === "object" &&
    typeof (rc as { bedrooms?: number }).bedrooms === "number";

  return (
    typeof o.basicNeeds === "string" &&
    roomCountsOk &&
    (o.floorCount === 1 || o.floorCount === 2) &&
    o.lotSize != null &&
    typeof (o.lotSize as { areaM2?: number }).areaM2 === "number" &&
    typeof o.planShape === "string"
  );
}

/** Pipeline completo (programa + layout) con debugTrace para scripts y herramientas. */
export async function POST(request: NextRequest) {
  let body: { userPreferences?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (!isUserPreferences(body.userPreferences)) {
    return NextResponse.json(
      { ok: false, error: "Faltan userPreferences" },
      { status: 400 },
    );
  }

  const prefs = body.userPreferences;
  const programResult = await generateArchitecturalProgram(prefs);

  if (!programResult.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: programResult.error,
        code: programResult.code,
        debugTrace: programResult.debugTrace,
      },
      { status: 422 },
    );
  }

  const { layout, debugTrace: layoutTrace } =
    computeFloorplanLayoutFromProgramWithDebug(
      programResult.program,
      prefs.planShape,
      { preferences: prefs },
    );

  const debugTrace = mergeTraces(
    programResult.debugTrace,
    layoutTrace,
  );

  return NextResponse.json({
    ok: true,
    program: programResult.program,
    layout: {
      templateId: layout.templateMeta?.templateId,
      templateReason: layout.templateMeta?.selectionReason,
      fillRatio: layout.fillRatio,
      warnings: layout.warnings,
      zoneCount: layout.zones.length,
      placed: layout.zones.map((z) => ({
        id: z.id,
        x: z.x,
        y: z.y,
        w: z.width,
        h: z.height,
      })),
    },
    programWarnings: programResult.warnings,
    model: programResult.model,
    repaired: programResult.repaired,
    debugTrace,
  });
}
