import { runFloorPlanPipeline } from "@/lib/architecture/floorPlanPipeline";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { prompt?: string; admin?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json(
      { ok: false, error: "Falta prompt" },
      { status: 400 },
    );
  }

  const result = await runFloorPlanPipeline(prompt);
  const admin = body.admin === true;

  return NextResponse.json({
    ok: result.status !== "failed",
    status: result.status,
    requestId: result.requestId,
    publicResult: result.publicResult,
    ...(admin ? { debug: result.debug } : {}),
  });
}
