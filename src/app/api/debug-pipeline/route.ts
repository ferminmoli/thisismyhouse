import { generateArchitecturalProgram } from "@/lib/architectural-program";
import { fetchQualityCalibration } from "@/lib/ai-prompts/fetch-quality-calibration";
import { generateLayoutVariationsAsync } from "@/lib/floorplan-layout/generate-layout-variations";
import { computeFloorplanLayoutFromProgramWithDebug } from "@/lib/floorplan-layout/compute-layout-debug";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { createPipelineTrace, mergeTraces } from "@/lib/pipeline-debug";
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

/** Pipeline completo con debugTrace (programa → layout → variaciones → Prompt 7). */
export async function POST(request: NextRequest) {
  let body: { userPreferences?: unknown; fullSuite?: boolean };
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
  const fullSuite = body.fullSuite !== false;

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

  const clientTrace = createPipelineTrace();

  const { layout, debugTrace: layoutTrace } =
    computeFloorplanLayoutFromProgramWithDebug(
      programResult.program,
      prefs.planShape,
      { preferences: prefs },
    );

  let variationsPayload: Awaited<
    ReturnType<typeof generateLayoutVariationsAsync>
  > | null = null;
  let calibrations: Array<{
    optionId: string;
    calibration: Awaited<ReturnType<typeof fetchQualityCalibration>>;
  }> = [];

  if (fullSuite) {
    clientTrace.push({
      id: "variations_start",
      phase: "layout",
      label: "Generación variaciones A–E (Prompt 3–5)",
      output: { maxOptions: 5 },
    });

    variationsPayload = await generateLayoutVariationsAsync({
      program: programResult.program,
      planShape: prefs.planShape,
      preferences: prefs,
      maxOptions: 5,
    });

    clientTrace.push({
      id: "variations_done",
      phase: "layout",
      label: "Variaciones rankeadas",
      status: "ok",
      output: {
        count: variationsPayload.variations.length,
        strategiesSource: variationsPayload.strategiesSource,
        recommendedId: variationsPayload.critic?.recommendedCandidateId,
        repairAttempts: variationsPayload.repairLog?.length ?? 0,
      },
    });

    for (const v of variationsPayload.variations.slice(0, 5)) {
      const cal = await fetchQualityCalibration(v);
      calibrations.push({ optionId: v.optionId, calibration: cal });
    }

    clientTrace.push({
      id: "quality_calibration",
      phase: "validate",
      label: "Calibración Prompt 7",
      output: {
        items: calibrations.map((c) => ({
          optionId: c.optionId,
          mustReject: c.calibration.ok
            ? c.calibration.calibration.mustReject
            : c.calibration.fallback.mustReject,
          scoreCalibration: c.calibration.ok
            ? c.calibration.calibration.scoreCalibration
            : c.calibration.fallback.scoreCalibration,
        })),
      },
    });
  }

  clientTrace.finish();

  const debugTrace = mergeTraces(
    programResult.debugTrace,
    layoutTrace,
    clientTrace.trace,
  );

  return NextResponse.json({
    ok: true,
    program: programResult.program,
    layout: {
      templateId: layout.templateMeta?.templateId,
      templateReason: layout.templateMeta?.selectionReason,
      validationOk: layout.templateMeta?.validation.ok,
      fillRatio: layout.fillRatio,
      warnings: layout.warnings,
      zoneCount: layout.zones.length,
    },
    variations: variationsPayload?.variations.map((v) => ({
      optionId: v.optionId,
      label: v.label,
      compositeScore: v.scores.compositeScore,
      repaired: v.repaired,
      validationOk: v.layout.templateMeta?.validation.ok,
      warnings: v.layout.warnings.filter((w) => w.startsWith("Solape:")),
    })),
    critic: variationsPayload?.critic,
    repairLog: variationsPayload?.repairLog,
    calibrations: calibrations.map((c) => ({
      optionId: c.optionId,
      ...(c.calibration.ok
        ? {
            source: c.calibration.source,
            ...c.calibration.calibration,
          }
        : {
            source: "local",
            ...c.calibration.fallback,
            warning: c.calibration.error,
          }),
    })),
    programWarnings: programResult.warnings,
    model: programResult.model,
    repaired: programResult.repaired,
    debugTrace,
  });
}
