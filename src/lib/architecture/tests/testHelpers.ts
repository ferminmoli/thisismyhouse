import { ARCHITECTURAL_PROGRAM_DISCLAIMER } from "../architecturalProgram";
import type { ArchitecturalProgram } from "../architecturalProgram";
import { extractArchitecturalProgram } from "../programExtractor";
import { buildTopologyGraph } from "../topologyGraphBuilder";
import { validateTopologyGraph } from "../topologyGraphBuilder";
import { selectArchitecturalStrategy } from "../strategySelector";
import { generatePlanFromParti } from "../partiGenerator";
import { validateGeneratedPlan } from "../generatedPlanValidator";
import { runArchitecturalPipeline } from "../generationPipeline";
import type { PipelineResult } from "../generationPipeline";
import { runFloorPlanPipeline } from "../floorPlanPipeline";
import type { FloorPlanPipelineResult } from "../floorPlanPipelineTypes";
import type { GeneratedPlan, GeneratedPlanValidation, RenderZone } from "../generatedPlan";
import type { TopologyGraph, TopologyEdge } from "../topologyGraph";
import type { ArchitecturalStrategy } from "../strategySelector";

export const TEST_PROMPT =
  "Casa familiar compacta de 100m2 en L, 3 dormitorios, 1 baño, cocina, living comedor y patio con buena luz.";

export const EXPECTED_DISCLAIMER = ARCHITECTURAL_PROGRAM_DISCLAIMER;

const GEOMETRY_KEYS = ["x", "y", "width", "height"] as const;

export async function createMockProgram(
  prompt = TEST_PROMPT,
): Promise<ArchitecturalProgram> {
  const result = await extractArchitecturalProgram(prompt);
  return result.program;
}

export async function createMockTopology(
  program?: ArchitecturalProgram,
): Promise<TopologyGraph> {
  const p = program ?? (await createMockProgram());
  return buildTopologyGraph(p);
}

export async function createMockStrategy(
  program?: ArchitecturalProgram,
  topology?: TopologyGraph,
): Promise<ArchitecturalStrategy> {
  const p = program ?? (await createMockProgram());
  const g = topology ?? buildTopologyGraph(p);
  return selectArchitecturalStrategy(p, g);
}

export async function createGeneratedPlan(): Promise<GeneratedPlan> {
  const program = await createMockProgram();
  const topology = buildTopologyGraph(program);
  const strategy = selectArchitecturalStrategy(program, topology);
  return generatePlanFromParti({ program, topologyGraph: topology, strategy });
}

export async function runFullPipeline(
  prompt = TEST_PROMPT,
  options?: { debug?: boolean },
): Promise<PipelineResult> {
  return runArchitecturalPipeline(prompt, options);
}

export async function runFullFloorPlanPipeline(
  prompt = TEST_PROMPT,
): Promise<FloorPlanPipelineResult> {
  return runFloorPlanPipeline(prompt);
}

export function getPlanFromPipeline(
  pipeline: PipelineResult,
  planId: string,
): GeneratedPlan {
  const plan = pipeline.plansById[planId];
  if (!plan) {
    throw new Error(`Plan id not found in plansById: ${planId}`);
  }
  return plan;
}

export function findZone(
  plan: GeneratedPlan,
  sourceRoomId: string,
): RenderZone | undefined {
  const n = sourceRoomId.trim().toUpperCase();
  return plan.zones.find((z) => z.sourceRoomId.toUpperCase() === n);
}

export function findDoor(
  plan: GeneratedPlan,
  from: string,
  to: string,
): GeneratedPlan["doors"][number] | undefined {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  return plan.doors.find(
    (d) =>
      d.from.toUpperCase() === a && d.to.toUpperCase() === b,
  );
}

export function findTopologyEdge(
  graph: TopologyGraph,
  from: string,
  to: string,
  strength?: "hard" | "soft",
): TopologyEdge | undefined {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  return graph.edges.find((e) => {
    const match =
      (e.from.toUpperCase() === a && e.to.toUpperCase() === b) ||
      (e.from.toUpperCase() === b && e.to.toUpperCase() === a);
    if (!match) return false;
    if (strength) return e.strength === strength;
    return true;
  });
}

export function findHardAdjacencyCheck(
  validation: GeneratedPlanValidation,
  from: string,
  to: string,
) {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  return validation.hardAdjacencyChecks.find(
    (c) =>
      (c.from.toUpperCase() === a && c.to.toUpperCase() === b) ||
      (c.from.toUpperCase() === b && c.to.toUpperCase() === a),
  );
}

export function expectNoGeometryInProgram(program: ArchitecturalProgram): void {
  for (const room of program.rooms) {
    const raw = room as Record<string, unknown>;
    for (const key of GEOMETRY_KEYS) {
      if (key in raw) {
        throw new Error(
          `Room ${room.id} must not contain geometry field "${key}"`,
        );
      }
    }
  }
}

export function expectZoneMeetsMinimum(
  zone: RenderZone | undefined,
  minWidth: number,
  minHeight: number,
  label: string,
): void {
  if (!zone) {
    throw new Error(`Zone ${label} not found`);
  }
  if (zone.width < minWidth || zone.height < minHeight) {
    throw new Error(
      `${label}: expected ≥${minWidth}×${minHeight}, got ${zone.width}×${zone.height}`,
    );
  }
}

export function hasHardAdjacency(
  program: ArchitecturalProgram,
  from: string,
  to: string,
): boolean {
  const a = from.toUpperCase();
  const b = to.toUpperCase();
  return program.hardAdjacencies.some(
    (e) =>
      e.strength === "hard" &&
      ((e.from.toUpperCase() === a && e.to.toUpperCase() === b) ||
        (e.from.toUpperCase() === b && e.to.toUpperCase() === a)),
  );
}

export async function createValidatedPipeline(): Promise<{
  program: ArchitecturalProgram;
  topology: TopologyGraph;
  strategy: ArchitecturalStrategy;
  plan: GeneratedPlan;
  validation: GeneratedPlanValidation;
  pipeline: PipelineResult;
}> {
  const pipeline = await runFullPipeline(TEST_PROMPT, { debug: true });
  if (!pipeline.generatedPlanId) {
    throw new Error("Pipeline did not produce generatedPlanId");
  }
  const plan = getPlanFromPipeline(pipeline, pipeline.generatedPlanId);
  const validation = validateGeneratedPlan(plan, {
    strategy: pipeline.strategy,
    program: pipeline.program,
    topologyGraph: pipeline.topologyGraph,
    hardAdjacencies: pipeline.program.hardAdjacencies,
  });
  return {
    program: pipeline.program,
    topology: pipeline.topologyGraph,
    strategy: pipeline.strategy,
    plan,
    validation,
    pipeline,
  };
}
