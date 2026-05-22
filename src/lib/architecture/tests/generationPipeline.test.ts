import { describe, expect, it } from "vitest";
import { runArchitecturalPipeline } from "../generationPipeline";
import {
  TEST_PROMPT,
  createValidatedPipeline,
  expectNoGeometryInProgram,
  getPlanFromPipeline,
} from "./testHelpers";

const EXPECTED_STAGES = [
  "user_prompt_received",
  "program_extractor_mock",
  "program_validate",
  "topology_graph_builder",
  "topology_graph_validate",
  "strategy_selector",
  "parti_template_selected",
  "parti_generator",
  "generated_plan_validate",
  "mutation_engine",
  "plan_scorer",
  "recommendation_engine",
] as const;

describe("generationPipeline", () => {
  it("runs full pipeline with all stages (mock LLM only)", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT, {
      debug: true,
    });

    const stageIds = pipeline.debug!.stages.map((s) => s.id);
    for (const id of EXPECTED_STAGES) {
      expect(stageIds).toContain(id);
    }

    expect(pipeline.extractorMeta.mock).toBe(true);
    expect(pipeline.extractorMeta.model).toBe("hardcoded-program-v1");
    expectNoGeometryInProgram(pipeline.program);
  });

  it("produces generated plan and validation", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT);
    const base = getPlanFromPipeline(pipeline, pipeline.generatedPlanId!);

    expect(base).toBeDefined();
    expect(pipeline.generatedPlanValidation).toBeDefined();
    expect(pipeline.strategy.preferredParti).toBe("l_shape_patio");
    expect(base.templateId).toBe("l_shape_patio");
  });

  it("marks generated_plan_validate ok when no errors/warnings", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT, {
      debug: true,
    });
    const stage = pipeline.debug!.stages.find(
      (s) => s.id === "generated_plan_validate",
    );

    expect(stage).toBeDefined();
    expect(pipeline.generatedPlanValidation.ok).toBe(true);
    expect(pipeline.generatedPlanValidation.errors).toHaveLength(0);
    expect(pipeline.generatedPlanValidation.warnings).toHaveLength(0);
    expect(stage!.status).toBe("ok");
  });

  it("debug contract: stable pipeline shape for regressions", async () => {
    const { pipeline, plan, validation } = await createValidatedPipeline();

    expect(pipeline.program.title).toBe(
      "Casa familiar compacta en L con patio",
    );
    expect(pipeline.program.desiredPlanShape).toBe("l_shape");
    expect(pipeline.program.site.lotShape).toBe("unknown");
    expect(pipeline.topologyGraph.nodes).toHaveLength(9);
    expect(pipeline.topologyGraph.edges).toHaveLength(10);
    expect(pipeline.strategy.preferredParti).toBe("l_shape_patio");
    expect(plan.templateId).toBe("l_shape_patio");
    expect(plan.zones).toHaveLength(9);
    expect(validation.ok).toBe(true);
    expect(validation.hardAdjacencyChecks.length).toBe(7);
    expect(validation.doorContactChecks).toHaveLength(7);
  });

  it("includes mutation_engine stage and variants", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT, {
      debug: true,
    });
    const stage = pipeline.debug!.stages.find((s) => s.id === "mutation_engine");

    expect(stage).toBeDefined();
    expect(pipeline.variants.length).toBeGreaterThanOrEqual(8);
    expect(pipeline.variants.some((v) => v.status === "ok")).toBe(true);
    expect(pipeline.extractorMeta.mock).toBe(true);

    const output = stage!.output as {
      variantCount: number;
      okCount: number;
      skippedCount: number;
      eligibleCount: number;
    };
    expect(output.variantCount).toBe(pipeline.variants.length);
    expect(output.okCount).toBeGreaterThanOrEqual(1);
    expect(output.skippedCount).toBeGreaterThanOrEqual(1);
    expect(output.eligibleCount).toBe(output.okCount);
    expect(
      pipeline.variants.every(
        (v) => new Set(v.messages).size === v.messages.length,
      ),
    ).toBe(true);
  });

  it("includes ranking with top 3 and recommendation", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT);

    expect(pipeline.ranking.length).toBeGreaterThanOrEqual(7);
    expect(pipeline.ranking.filter((r) => r.rank <= 3).length).toBe(3);
    expect(pipeline.recommendation).not.toBeNull();
    expect(pipeline.recommendation!.bestVariantId).toBe(
      pipeline.ranking[0]!.mutationType,
    );
    expect(pipeline.recommendation?.selectionMethod).toBeDefined();
  });

  it("keeps base plan in plansById while mirror variant differs", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT);
    const baseRef = pipeline.variants.find((v) => v.mutationType === "base")!;
    const mirrored = pipeline.variants.find(
      (v) => v.mutationType === "mirror_horizontal",
    );
    const basePlan = getPlanFromPipeline(pipeline, baseRef.planId);
    const genPlan = getPlanFromPipeline(
      pipeline,
      pipeline.generatedPlanId!,
    );

    expect(basePlan.variantLabel).toMatch(/base/i);
    expect(basePlan.zones[0]!.x).toBe(genPlan.zones[0]!.x);
    if (mirrored && mirrored.status === "ok") {
      const mirrorPlan = getPlanFromPipeline(pipeline, mirrored.planId);
      expect(mirrorPlan.zones[0]!.x).not.toBe(genPlan.zones[0]!.x);
    }
  });
});

describe("generationPipeline stage status semantics", () => {
  it("generated_plan_validate status reflects validation outcome", async () => {
    const pipeline = await runArchitecturalPipeline(TEST_PROMPT, {
      debug: true,
    });
    const stage = pipeline.debug!.stages.find(
      (s) => s.id === "generated_plan_validate",
    )!;
    const v = pipeline.generatedPlanValidation;

    if (v.errors.length > 0) {
      expect(stage.status).toBe("error");
    } else if (v.warnings.length > 0) {
      expect(stage.status).toBe("warn");
    } else {
      expect(stage.status).toBe("ok");
    }
  });
});
