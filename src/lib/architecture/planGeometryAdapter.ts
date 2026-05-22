import type { PublicPlanGeometry } from "./publicFloorPlanTypes";
import type { GeneratedPlan } from "./generatedPlan";

/** Maps public plan geometry to internal renderer coordinates (100×100). */
export function publicPlanToGenerated(plan: PublicPlanGeometry): GeneratedPlan {
  return {
    id: plan.id,
    title: plan.title ?? "Planta",
    templateId: plan.templateId ?? "conceptual",
    variantLabel: plan.variantLabel ?? "",
    zones: plan.zones.map((z) => ({
      id: z.id,
      label: z.label,
      type: z.type as GeneratedPlan["zones"][0]["type"],
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      sourceRoomId: z.id.startsWith("zone_")
        ? z.id.replace(/^zone_/, "")
        : z.id,
      slotId: z.id,
      priority: "medium",
    })),
    doors: plan.doors.map((d) => ({
      ...d,
      type: d.type as GeneratedPlan["doors"][0]["type"],
      wall: d.wall as GeneratedPlan["doors"][0]["wall"],
    })),
    windows: plan.windows.map((w) => ({
      ...w,
      wall: w.wall as GeneratedPlan["windows"][0]["wall"],
      size: (w.size ?? "medium") as GeneratedPlan["windows"][0]["size"],
      reason: w.reason ?? "",
    })),
    furniture: (plan.furniture ?? []).map((f) => ({
      ...f,
      type: f.type as GeneratedPlan["furniture"][0]["type"],
    })),
    metadata: {
      parti: plan.templateId ?? "conceptual",
      templateName: plan.templateId ?? "conceptual",
      mapping: [],
      warnings: [],
      notes: [],
      areaEstimate: plan.areaEstimate
        ? {
            targetCoveredAreaM2: plan.areaEstimate.coveredM2 ?? 0,
            estimatedCoveredAreaM2: plan.areaEstimate.coveredM2 ?? 0,
            targetOutdoorAreaM2: plan.areaEstimate.outdoorM2 ?? null,
            estimatedOutdoorAreaM2: plan.areaEstimate.outdoorM2 ?? 0,
            estimatedSemiCoveredAreaM2: plan.areaEstimate.semiCoveredM2 ?? 0,
            estimatedTotalProgramAreaM2: plan.areaEstimate.totalM2 ?? 0,
            coveredCanvasUnits: 0,
            outdoorCanvasUnits: 0,
            semiCoveredCanvasUnits: 0,
            zoneAreaEstimates: plan.zones
              .filter((z) => z.estimatedAreaM2 != null)
              .map((z) => ({
                roomId: z.id.replace(/^zone_/, ""),
                type: z.type as GeneratedPlan["zones"][0]["type"],
                estimatedAreaM2: z.estimatedAreaM2!,
                areaKind: z.areaKind ?? "covered",
              })),
            confidence: (plan.areaEstimate.confidence as "low") ?? "low",
            method: "public",
          }
        : undefined,
    },
  };
}
