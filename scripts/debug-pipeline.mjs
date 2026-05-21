#!/usr/bin/env node
/**
 * Ejecuta el pipeline vía API local y imprime cada paso en stdout.
 * Uso: npm run dev (otra terminal) && npm run debug:pipeline
 *
 * Opciones env:
 *   DEBUG_SHAPE=l_shape|rectangular|square
 *   DEBUG_AREA_M2=120
 *   DEBUG_PORT=3000
 */

const shape = process.env.DEBUG_SHAPE ?? "l_shape";
const areaM2 = Number(process.env.DEBUG_AREA_M2 ?? "120");
const port = process.env.DEBUG_PORT ?? "3000";

const userPreferences = {
  basicNeeds: "Casa familiar compacta con buena luz en living",
  roomCounts: {
    bedrooms: 3,
    bathrooms: 2,
    kitchens: 1,
    living: 1,
    patio: 1,
    garage: 0,
  },
  floorCount: 1,
  lotSize: { areaM2, unit: "m2" },
  planShape: shape,
  completedAt: new Date().toISOString(),
};

const base = `http://localhost:${port}`;

async function main() {
  console.log("\n▶ debug-pipeline");
  console.log("  shape:", shape, " area:", areaM2, "m²\n");

  const res = await fetch(`${base}/api/debug-pipeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPreferences }),
  });

  const data = await res.json();
  console.log("HTTP", res.status, data.ok ? "OK" : "FAIL\n");

  if (data.debugTrace?.steps) {
    for (const [i, s] of data.debugTrace.steps.entries()) {
      const icon =
        s.status === "ok" ? "✓" : s.status === "warn" ? "⚠" : s.status === "error" ? "✗" : "○";
      console.log(`${icon} ${i + 1}. [${s.phase}] ${s.id} — ${s.label}`);
      if (s.messages?.length) console.log("   messages:", s.messages.join(" | "));
      console.log("   output:", JSON.stringify(s.output, null, 2).split("\n").join("\n   "));
      console.log("");
    }
  } else {
    console.log("(sin debugTrace — activá PIPELINE_DEBUG=true o NODE_ENV=development)\n");
  }

  if (!data.ok) {
    console.error("ERROR:", data.error);
    process.exit(1);
  }

  const sum = data.program.programmaticZones.reduce((s, z) => s + z.idealAreaM2, 0);
  const target = data.program.globalConfig.targetTotalAreaM2;
  console.log("── Resumen ──");
  console.log("Programa:", data.program.title);
  console.log("  model:", data.model, " repaired:", data.repaired);
  console.log("  zonas:", data.program.programmaticZones.length);
  console.log(
    "  sum ideal:",
    sum.toFixed(1),
    "m² / target:",
    target,
    "m² ratio:",
    (sum / target).toFixed(3),
  );
  console.log("  program warnings:", data.programWarnings?.join("; ") || "(ninguna)");
  console.log("  layout fill:", ((data.layout?.fillRatio ?? 0) * 100).toFixed(1) + "%");
  console.log("  layout warnings:", data.layout?.warnings?.join("; ") || "(ninguna)");
  if (data.layout?.placed) {
    console.log("  placed rects:");
    for (const z of data.layout.placed) {
      console.log(`    ${z.id}: ${z.w}×${z.h} @ (${z.x},${z.y})`);
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error(e.message);
  console.error("\n¿Está corriendo npm run dev en el puerto", port, "?\n");
  process.exit(1);
});
