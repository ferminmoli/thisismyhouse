import type { ArchitecturalProgram } from "@/lib/architectural-program/types";
import { fetchUserExplanation } from "@/lib/ai-prompts/fetch-user-explanation";
import { structuredBriefFromPreferences } from "@/lib/ai-prompts/types";
import type { LayoutVariation } from "@/lib/floorplan-layout/generate-layout-variations";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { NextRequest, NextResponse } from "next/server";

function isPreferences(v: unknown): v is UserPreferences {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.basicNeeds === "string" &&
    o.roomCounts != null &&
    o.lotSize != null &&
    typeof o.planShape === "string"
  );
}

function isVariation(v: unknown): v is LayoutVariation {
  if (!v || typeof v !== "object") return false;
  const o = v as LayoutVariation;
  return typeof o.optionId === "string" && o.layout?.zones != null && o.scores != null;
}

function isProgram(v: unknown): v is ArchitecturalProgram {
  if (!v || typeof v !== "object") return false;
  const o = v as ArchitecturalProgram;
  return Array.isArray(o.programmaticZones) && o.programmaticZones.length > 0;
}

export async function POST(request: NextRequest) {
  let body: {
    variation?: unknown;
    program?: unknown;
    userPreferences?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  if (
    !isVariation(body.variation) ||
    !isProgram(body.program) ||
    !isPreferences(body.userPreferences)
  ) {
    return NextResponse.json(
      { ok: false, error: "Faltan variation, program o userPreferences" },
      { status: 400 },
    );
  }

  const brief = structuredBriefFromPreferences(body.userPreferences);
  const result = await fetchUserExplanation({
    variation: body.variation,
    program: body.program,
    structuredBrief: brief,
  });

  if (!result.ok) {
    return NextResponse.json({
      ok: true,
      explanation: result.fallback,
      source: "local",
      warning: result.error,
    });
  }

  return NextResponse.json({
    ok: true,
    explanation: result.explanation,
    source: result.source,
    model: result.model,
  });
}
