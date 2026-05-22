import { describe, expect, it } from "vitest";
import {
  createMockProgram,
  createMockStrategy,
  createMockTopology,
} from "./testHelpers";

describe("strategySelector", () => {
  it("selects l_shape_patio with expected candidates and constraints", async () => {
    const strategy = await createMockStrategy();

    expect(strategy.preferredParti).toBe("l_shape_patio");
    expect(strategy.partiCandidates).toContain("l_shape_patio");
    expect(strategy.partiCandidates).toContain("two_wing_family");
    expect(strategy.partiCandidates).toContain("compact_linear");

    expect(strategy.constraints).toEqual({
      bedroomsCount: 3,
      bathroomsCount: 1,
      needsPatio: true,
      needsPrivateWing: true,
      needsIntegratedKitchen: true,
      targetAreaM2: 100,
    });
  });

  it("includes topology-aware reasons in Spanish", async () => {
    const strategy = await createMockStrategy();
    const blob = strategy.reasons.join(" ").toLowerCase();

    expect(blob).toMatch(/desiredplanshape|l_shape|planta en l/);
    expect(blob).toMatch(/social|exterior|outdoor|patio/);
    expect(blob).toMatch(/privad|dormitorio|cluster/);
  });

  it("uses topology graph (private node count from graph)", async () => {
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const strategy = await createMockStrategy(program, topology);
    expect(strategy.constraints.bedroomsCount).toBe(3);
    expect(topology.nodes.filter((n) => n.type === "private")).toHaveLength(3);
  });
});
