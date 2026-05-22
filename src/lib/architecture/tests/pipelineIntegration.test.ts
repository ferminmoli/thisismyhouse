import { describe, expect, it } from "vitest";
import { runFloorPlanPipeline } from "../floorPlanPipeline";
import type { PublicFloorPlanResult } from "../floorPlanPipelineTypes";

const PROMPT_A =
  "Casa familiar de 100m2 con 3 dormitorios, cocina integrada, living comedor, baño, patio y buena luz natural";

const PROMPT_B = "Casa chica de 70m2 con 2 dormitorios y patio";

const PROMPT_C = "Casa con galería y parrilla";

const PROMPT_D = "Casa en lote angosto con 3 dormitorios y patio";

function assertNoInternalScoreLeak(publicResult: PublicFloorPlanResult) {
  const json = JSON.stringify(publicResult);
  expect(json).not.toContain("penalties");
  expect(json).not.toContain("mutationIntentScore");
  expect(json).not.toContain("invalidAdjacency");
  for (const v of publicResult.topVariants) {
    expect(Object.keys(v)).not.toContain("score");
  }
}

describe("floor plan pipeline integration", () => {
  it("A — family 100m²: program rooms, laundry recommendation, public without penalties", async () => {
    const result = await runFloorPlanPipeline(PROMPT_A);
    expect(result.status).toBe("ok");
    expect(result.extractedProgram.program.rooms.length).toBeGreaterThanOrEqual(5);

    const bedroomCount = result.extractedProgram.program.rooms.filter((r) =>
      /dormitorio/i.test(r.label),
    ).length;
    expect(bedroomCount).toBeGreaterThanOrEqual(3);

    assertNoInternalScoreLeak(result.publicResult);
    expect(result.publicResult.disclaimers.length).toBeGreaterThan(0);
    expect(result.publicResult.svgPlans.length).toBeGreaterThan(0);

    const rec = result.recommendedVariant!;
    expect(rec.mutationType).toBe("add_laundry_as_kitchen_extension");
    expect(rec.rank).toBe(1);
    expect(result.publicResult.confidence.reasons.some((r) =>
      /orientación/i.test(r),
    )).toBe(true);

    expect(result.topVariants[0]!.mutationType).toBe(rec.mutationType);
    expect(result.topVariants).toHaveLength(3);
    expect(result.topVariants[0]!.score.total).toBeGreaterThanOrEqual(
      result.topVariants[1]!.score.total,
    );
  }, 30_000);

  it("B — compact 70m²: 2 bedrooms, valid partial or ok pipeline", async () => {
    const result = await runFloorPlanPipeline(PROMPT_B);
    expect(["ok", "partial"]).toContain(result.status);

    const bedrooms = result.extractedProgram.program.rooms.filter((r) =>
      /dormitorio/i.test(r.label),
    );
    expect(bedrooms.length).toBeGreaterThanOrEqual(2);
    assertNoInternalScoreLeak(result.publicResult);
    expect(result.publicResult.architectBrief.projectSummary.length).toBeGreaterThan(
      10,
    );
  }, 30_000);

  it("C — gallery and grill: mentions gallery in brief or inspiration", async () => {
    const result = await runFloorPlanPipeline(PROMPT_C);
    expect(result.status).not.toBe("failed");

    const briefText = JSON.stringify(result.publicResult.architectBrief);
    const visualText = result.publicResult.visualInspiration.prompt.toLowerCase();
    const hasGalleryConcept =
      briefText.toLowerCase().includes("galer") ||
      visualText.includes("galer") ||
      visualText.includes("gallery") ||
      result.generatedVariants.some((v) => v.mutationType === "gallery_patio");

    expect(hasGalleryConcept).toBe(true);
    assertNoInternalScoreLeak(result.publicResult);
    expect(result.publicResult.visualInspiration.safetyNote).toMatch(
      /referencia|reference/i,
    );
  }, 30_000);

  it("D — narrow lot: strategy notes narrow constraints", async () => {
    const result = await runFloorPlanPipeline(PROMPT_D);
    expect(result.status).not.toBe("failed");

    const strategyText = [
      result.strategy.summary,
      ...result.strategy.reasons,
      ...result.publicResult.architectBrief.spatialStrategy,
    ]
      .join(" ")
      .toLowerCase();

    const mentionsNarrow =
      strategyText.includes("angost") ||
      strategyText.includes("narrow") ||
      result.extractedProgram.program.site.lotShape === "narrow";

    expect(mentionsNarrow).toBe(true);
    assertNoInternalScoreLeak(result.publicResult);
  }, 30_000);

  it("debug payload includes scoring and selection trace", async () => {
    const result = await runFloorPlanPipeline(PROMPT_A);
    expect(result.debug.scoringDetails.length).toBeGreaterThan(0);
    expect(result.debug.selectionMethod?.finalRecommendedVariant).toBe(
      result.recommendedVariant?.mutationType,
    );
    expect(result.debug.selectionMethod?.recommendedEqualsTopScored).toBe(true);
    expect(result.debug.pipelineStages.some((s) => s.id === "svg_renderer")).toBe(
      true,
    );
  }, 30_000);

  it("nearTieApplied only when contenders within threshold", async () => {
    const result = await runFloorPlanPipeline(PROMPT_A);
    const sel = result.debug.selectionMethod;
    expect(sel).not.toBeNull();
    if (sel!.nearTieApplied) {
      const top = result.scoredVariants[0]!.score.total;
      const within = result.scoredVariants.filter(
        (v) => top - v.score.total <= sel!.nearTieThreshold,
      );
      expect(within.length).toBeGreaterThan(1);
    }
  }, 30_000);
});
