import { describe, expect, it } from "vitest";
import { validateTopologyGraph } from "../topologyGraphBuilder";
import {
  createMockProgram,
  createMockTopology,
  findTopologyEdge,
} from "./testHelpers";

describe("topologyGraphBuilder", () => {
  it("builds 9 nodes and 9 edges (7 hard, 2 soft)", async () => {
    const graph = await createMockTopology();
    expect(graph.nodes).toHaveLength(9);
    expect(graph.edges).toHaveLength(10);
    expect(graph.edges.filter((e) => e.strength === "hard")).toHaveLength(7);
    expect(graph.edges.filter((e) => e.strength === "soft")).toHaveLength(3);
  });

  it("assigns expected functional clusters", async () => {
    const graph = await createMockTopology();
    const clusterIds = new Set(graph.clusters.map((c) => c.id));
    expect(clusterIds).toContain("access_cluster");
    expect(clusterIds).toContain("social_cluster");
    expect(clusterIds).toContain("service_cluster");
    expect(clusterIds).toContain("private_cluster");
    expect(clusterIds).toContain("circulation_cluster");
    expect(clusterIds).toContain("outdoor_cluster");
  });

  it("infers SALA_COMEDOR ↔ COCINA as hard open_passage weight 100", async () => {
    const graph = await createMockTopology();
    const edge = findTopologyEdge(graph, "SALA_COMEDOR", "COCINA", "hard");
    expect(edge).toBeDefined();
    expect(edge?.desiredConnection).toBe("open_passage");
    expect(edge?.weight).toBe(100);
  });

  it("infers SALA_COMEDOR ↔ PATIO as hard open_passage weight 100", async () => {
    const graph = await createMockTopology();
    const edge = findTopologyEdge(graph, "SALA_COMEDOR", "PATIO", "hard");
    expect(edge?.desiredConnection).toBe("open_passage");
    expect(edge?.weight).toBe(100);
  });

  it("infers DISTRIBUIDOR ↔ DORMITORIO_2 as hard door weight 90", async () => {
    const graph = await createMockTopology();
    const edge = findTopologyEdge(graph, "DISTRIBUIDOR", "DORMITORIO_2", "hard");
    expect(edge?.desiredConnection).toBe("door");
    expect(edge?.weight).toBe(90);
  });

  it("infers COCINA ↔ PATIO as soft near weight 30", async () => {
    const graph = await createMockTopology();
    const edge = findTopologyEdge(graph, "COCINA", "PATIO", "soft");
    expect(edge?.desiredConnection).toBe("near");
    expect(edge?.weight).toBe(30);
  });

  it("passes topology validation without errors", async () => {
    const program = await createMockProgram();
    const graph = await createMockTopology(program);
    const result = validateTopologyGraph(graph, program);
    expect(result.errors).toHaveLength(0);
  });
});
