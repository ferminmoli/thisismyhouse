import { describe, expect, it } from "vitest";
import { generatePlanVariants, summarizeVariants } from "../variantGenerator";
import { DEFAULT_MUTATION_TYPES } from "../mutations";
import {
  createGeneratedPlan,
  createMockTopology,
} from "./testHelpers";

describe("variantGenerator", () => {
  it("returns at least 7 variants by default", async () => {
    const basePlan = await createGeneratedPlan();
    const topologyGraph = await createMockTopology();
    const variants = generatePlanVariants({ basePlan, topologyGraph });

    expect(variants.length).toBeGreaterThanOrEqual(7);
    expect(variants.length).toBe(DEFAULT_MUTATION_TYPES.length);
  });

  it("every variant has required fields", async () => {
    const basePlan = await createGeneratedPlan();
    const topologyGraph = await createMockTopology();
    const variants = generatePlanVariants({ basePlan, topologyGraph });

    for (const v of variants) {
      expect(v.plan.id).toBeTruthy();
      expect(v.plan.variantLabel).toBeTruthy();
      expect(v.validation).toBeDefined();
      expect(v.mutationType).toBeTruthy();
      expect(["ok", "warn", "error", "skipped"]).toContain(v.status);
      expect(typeof v.eligibleForRanking).toBe("boolean");
      expect(v.effect).toBeDefined();
      expect(typeof v.effect.changed).toBe("boolean");
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(new Set(v.messages).size).toBe(v.messages.length);
    }
  });

  it("summarizeVariants counts all statuses including skipped", async () => {
    const basePlan = await createGeneratedPlan();
    const topologyGraph = await createMockTopology();
    const variants = generatePlanVariants({ basePlan, topologyGraph });
    const summary = summarizeVariants(variants);

    expect(summary.variantCount).toBe(variants.length);
    expect(
      summary.okCount +
        summary.warnCount +
        summary.errorCount +
        summary.skippedCount,
    ).toBe(variants.length);
    expect(summary.eligibleCount).toBe(
      variants.filter((v) => v.eligibleForRanking).length,
    );
    expect(summary.variants).toHaveLength(variants.length);
    for (const row of summary.variants) {
      expect(row).toHaveProperty("changed");
      expect(row).toHaveProperty("eligibleForRanking");
    }
  });

  it("base variant is ok and eligible", async () => {
    const basePlan = await createGeneratedPlan();
    const topologyGraph = await createMockTopology();
    const variants = generatePlanVariants({ basePlan, topologyGraph });
    const base = variants.find((v) => v.mutationType === "base");

    expect(base).toBeDefined();
    expect(base!.status).toBe("ok");
    expect(base!.eligibleForRanking).toBe(true);
    expect(base!.validation.errors).toHaveLength(0);
    expect(base!.validation.warnings).toHaveLength(0);
  });
});
