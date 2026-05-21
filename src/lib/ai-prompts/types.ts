import type { UserPreferences } from "@/lib/onboarding/user-preferences";

/** Brief estructurado (salida Prompt 1 o derivado del onboarding). */
export type StructuredBrief = {
  site: {
    targetBuiltAreaM2: number;
    lotWidthM: number | null;
    lotDepthM: number | null;
    assumedLotRatio: "compact" | "narrow" | "wide" | "unknown";
    accessSide: "north" | "south" | "east" | "west" | "unknown";
    northOrientation: "north" | "south" | "east" | "west" | "unknown";
    massingShape: UserPreferences["planShape"];
    siteAssumptions: string[];
  };
  lifestyle: {
    privacyPriority: number;
    socialPriority: number;
    outdoorPriority: number;
    workFromHome: boolean;
    pets: boolean;
    hosting: "low" | "medium" | "high" | "unknown";
  };
  preferences: {
    kitchenMode: "integrated" | "semi_open" | "separate" | "unknown";
    bedroomGrouping: "together" | "main_separated" | "unknown";
    patioRelationship: "central" | "rear" | "side" | "none" | "unknown";
    naturalLightPriority: number;
    ventilationPriority: number;
  };
  openQuestions: string[];
};

export function structuredBriefFromPreferences(
  prefs: UserPreferences,
): StructuredBrief {
  const area = prefs.lotSize.areaM2;
  const narrow = area < 95 || /angost|estrech|narrow/i.test(prefs.basicNeeds);
  const patioRel =
    prefs.roomCounts.patio > 0
      ? prefs.planShape === "square"
        ? "central"
        : "rear"
      : "none";

  return {
    site: {
      targetBuiltAreaM2: area,
      lotWidthM: null,
      lotDepthM: null,
      assumedLotRatio: narrow ? "narrow" : area > 140 ? "wide" : "compact",
      accessSide: "unknown",
      northOrientation: "unknown",
      massingShape: prefs.planShape,
      siteAssumptions: prefs.lotSize.assumedM2FromSqft
        ? ["Superficie interpretada como m² desde entrada en sqft"]
        : [],
    },
    lifestyle: {
      privacyPriority: prefs.roomCounts.bedrooms >= 3 ? 4 : 3,
      socialPriority: prefs.roomCounts.living > 0 ? 4 : 3,
      outdoorPriority: prefs.roomCounts.patio > 0 ? 4 : 2,
      workFromHome: /oficina|home office|teletrabajo/i.test(prefs.basicNeeds),
      pets: /mascota|perro|gato/i.test(prefs.basicNeeds),
      hosting: /familia|reunion|parrill|galer/i.test(prefs.basicNeeds)
        ? "high"
        : "medium",
    },
    preferences: {
      kitchenMode: "integrated",
      bedroomGrouping:
        prefs.roomCounts.bedrooms >= 3 ? "main_separated" : "together",
      patioRelationship: patioRel,
      naturalLightPriority: 4,
      ventilationPriority: 3,
    },
    openQuestions: [],
  };
}
