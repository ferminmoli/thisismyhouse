import { describe, expect, it } from "vitest";
import {
  assertPublicResultSanitized,
  presentFloorPlanPipeline,
} from "../floorPlanResultPresenter";
import { shouldShowFloorPlanDebug } from "@/lib/floorplan-result/featureFlags";
import { runFloorPlanPipeline } from "../floorPlanPipeline";
import { TEST_PROMPT } from "./testHelpers";

function assertNoScorerLeak(obj: unknown): void {
  const json = JSON.stringify(obj).toLowerCase();
  const forbidden = [
    "penalties",
    "hardadjacencychecks",
    "doorcontactchecks",
    "mutationintentscore",
    "invalidadjacency",
    "scoringdetails",
  ];
  for (const f of forbidden) {
    expect(json).not.toContain(f);
  }
}

describe("FloorPlanResultPresenter", () => {
  it("maps recommended variant correctly from full pipeline", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const rec = result.publicResult.recommendedVariant;
    expect(rec.id).toBeTruthy();
    expect(rec.plan.zones.length).toBeGreaterThan(0);
    expect(rec.plan.zones[0]).toHaveProperty("label");
    expect(rec.plan.zones[0]).not.toHaveProperty("penalties");
    expect(result.publicResult.topVariants).toHaveLength(3);
    expect(result.publicResult.topVariants[0]!.rank).toBe(1);
    assertNoScorerLeak(result.publicResult);
    assertPublicResultSanitized(result.publicResult);
  }, 30_000);

  it("recommended matches pipeline recommendation engine output", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const engineId = result.debug?.recommendationRaw as {
      bestVariantId?: string;
    } | null;
    if (engineId?.bestVariantId) {
      expect(result.publicResult.recommendedVariant.id).toBe(
        engineId.bestVariantId,
      );
    }
    expect(result.publicResult.topVariants[0]!.id).toBe(
      result.publicResult.recommendedVariant.id,
    );
  }, 30_000);

  it("excludes skipped variants from topVariants", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const skippedInTop = result.debug?.rawVariants as
      | Array<{ mutationType: string; status: string }>
      | undefined;
    const skippedIds = new Set(
      (skippedInTop ?? [])
        .filter((v) => v.status === "skipped")
        .map((v) => v.mutationType),
    );
    for (const v of result.publicResult.topVariants) {
      expect(skippedIds.has(v.id)).toBe(false);
    }
  }, 30_000);

  it("includes debug only when debug mode is enabled", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const expectDebug = shouldShowFloorPlanDebug({ isDev: true });
    if (expectDebug) {
      expect(result.debug).toBeDefined();
      expect(result.debug?.stages).toBeDefined();
      expect(result.debug?.scoredVariants).toBeDefined();
    }
  }, 30_000);

  it("maps visual inspiration without raw prompt-engineering tags", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const insp = result.publicResult.visualInspiration;
    expect(insp?.prompt).toBeTruthy();
    const json = JSON.stringify(insp).toLowerCase();
    expect(json).not.toContain("negativeprompt");
    expect(json).not.toContain("mutationintentscore");
    if (insp?.notes.length) {
      expect(insp.notes.join(" ")).not.toMatch(/Estilo: modern compact/i);
    }
  }, 30_000);

  it("omits debug when explicitly disabled", async () => {
    const pipeline = await runFloorPlanPipeline(TEST_PROMPT);
    const internal = await import("../generationPipeline").then((m) =>
      m.runArchitecturalPipelineInternal(TEST_PROMPT, { debug: true }),
    );
    const presented = presentFloorPlanPipeline(internal, {
      requestId: "test",
      includeDebug: false,
      isAdmin: false,
      isDev: false,
    });
    if (process.env.NODE_ENV !== "development") {
      expect(presented.debug).toBeUndefined();
    }
  }, 30_000);

  it("maps area estimates into room summaries", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    const { architectBrief, recommendedVariant } = result.publicResult;
    expect(architectBrief.areas.coveredM2).toBeGreaterThan(0);
    expect(architectBrief.rooms.length).toBeGreaterThan(0);
    expect(
      architectBrief.rooms.some((r) => r.estimatedAreaM2 != null),
    ).toBe(true);
    expect(recommendedVariant.plan.areaEstimate?.coveredM2).toBeGreaterThan(0);
  }, 30_000);

  it("maps confidence and professional review", async () => {
    const result = await runFloorPlanPipeline(TEST_PROMPT);
    expect(result.publicResult.confidence.level).toBeTruthy();
    expect(result.publicResult.confidence.reasons.length).toBeGreaterThan(0);
    expect(result.publicResult.professionalReview.required).toBe(true);
    expect(result.publicResult.professionalReview.items.length).toBeGreaterThan(
      0,
    );
    expect(result.publicResult.disclaimer.length).toBeGreaterThan(20);
  }, 30_000);

  it("handles missing optional fields gracefully", () => {
    const scoredVariant = {
      mutationType: "base" as const,
      label: "Base",
      description: "Planta base",
      plan: {
        id: "p1",
        title: "Casa test",
        templateId: "t",
        variantLabel: "Base",
        zones: [
          {
            id: "zone_LIVING",
            label: "Living",
            type: "social" as const,
            x: 10,
            y: 10,
            width: 40,
            height: 30,
            sourceRoomId: "LIVING",
            slotId: "s1",
            priority: "high" as const,
          },
        ],
        doors: [],
        windows: [],
        furniture: [],
        metadata: {
          parti: "linear",
          templateName: "t",
          mapping: [],
          warnings: [],
          notes: [],
        },
      },
      validation: {
        ok: true,
        errors: [],
        warnings: [],
        infos: [],
        architecturalIssues: [],
        hardAdjacencyChecks: [],
        doorContactChecks: [],
      },
      status: "ok" as const,
      eligibleForRanking: true,
      messages: [],
      effect: { changedZones: [], changedDoors: [], changedWindows: [] },
      score: {
        total: 80,
        adjacencyScore: 18,
        daylightScore: 12,
        socialOutdoorScore: 14,
        privateWingScore: 10,
        kitchenIntegrationScore: 8,
        areaEfficiencyScore: 8,
        wetCoreEfficiencyScore: 6,
        ventilationScore: 4,
        dimensionalQualityScore: 4,
        orientationConfidenceScore: 4,
        mutationIntentScore: 6,
        penalties: {
          warnings: 0,
          errors: 0,
          skipped: 0,
          invalidAdjacency: 0,
          aspectRatio: 0,
          excessiveMutation: 0,
          missingLaundry: 0,
          poorBedroomProportion: 0,
          unknownOrientationDaylight: 0,
          patioAsCovered: 0,
          galleryAsFurniture: 0,
          wetRoomsFar: 0,
          noVentilation: 0,
          laundryNoVentilation: 0,
        },
        reasons: ["Buen equilibrio general."],
      },
      rank: 1,
    };

    const presented = presentFloorPlanPipeline(
      {
        userPrompt: "casa",
        program: {
          title: "Casa test",
          inputSummary: "casa",
          rooms: [
            {
              id: "LIVING",
              label: "Living",
              type: "social",
              required: true,
              priority: "high",
            },
          ],
          hardAdjacencies: [],
          softAdjacencies: [],
          priorities: [],
          architectQuestions: [],
          site: {
            orientation: "unknown",
            lotShape: "unknown",
            notes: [],
          },
        },
        topologyGraph: { nodes: [], edges: [] },
        topologyValidation: { ok: true, errors: [], warnings: [] },
        strategy: {
          preferredParti: "linear",
          reasons: ["Test"],
          warnings: [],
        },
        generatedPlan: null,
        generatedPlanValidation: {
          ok: true,
          errors: [],
          warnings: [],
          infos: [],
          architecturalIssues: [],
          hardAdjacencyChecks: [],
          doorContactChecks: [],
        },
        variants: [scoredVariant],
        scoredVariants: [scoredVariant],
        topVariants: [scoredVariant],
        recommendedVariant: scoredVariant,
        recommendation: null,
        validation: { ok: true, errors: [], warnings: [] },
        stages: [],
        extractorMeta: { mock: true, model: "test" },
      },
      { requestId: "r1", includeDebug: false },
    );

    expect(presented.publicResult.recommendedVariant.id).toBe("base");
    expect(presented.publicResult.topVariants).toHaveLength(1);
    expect(presented.publicResult.visualInspiration?.prompt.length).toBeGreaterThan(
      0,
    );
    assertPublicResultSanitized(presented.publicResult);
  });
});
