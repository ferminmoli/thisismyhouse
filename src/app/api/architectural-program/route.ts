import { generateArchitecturalProgram } from "@/lib/architectural-program";
import type { UserPreferences } from "@/lib/onboarding/user-preferences";
import { NextRequest, NextResponse } from "next/server";

function isUserPreferences(v: unknown): v is UserPreferences {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const rc = o.roomCounts;
  const roomCountsOk =
    rc != null &&
    typeof rc === "object" &&
    typeof (rc as { bedrooms?: number }).bedrooms === "number" &&
    typeof (rc as { bathrooms?: number }).bathrooms === "number";

  return (
    typeof o.basicNeeds === "string" &&
    roomCountsOk &&
    (o.floorCount === 1 || o.floorCount === 2) &&
    o.lotSize != null &&
    typeof o.lotSize === "object" &&
    typeof (o.lotSize as { areaM2?: number }).areaM2 === "number" &&
    typeof o.planShape === "string" &&
    typeof o.completedAt === "string"
  );
}

export async function POST(request: NextRequest) {
  let body: { userPreferences?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo JSON inválido", code: "validation" },
      { status: 400 },
    );
  }

  if (!isUserPreferences(body.userPreferences)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Faltan userPreferences del onboarding",
        code: "validation",
      },
      { status: 400 },
    );
  }

  const result = await generateArchitecturalProgram(body.userPreferences);
  const status = result.ok
    ? 200
    : result.code === "rate_limit"
      ? 429
      : result.code === "service_unavailable"
        ? 503
        : result.code === "config"
          ? 500
          : 422;

  return NextResponse.json(result, { status });
}
