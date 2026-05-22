import { describe, expect, it } from "vitest";
import { validateGeneratedPlan } from "../generatedPlanValidator";
import { rectsOverlap } from "../zoneGeometry";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockStrategy,
  createMockTopology,
  findHardAdjacencyCheck,
  findZone,
} from "./testHelpers";

const WORKAROUND_RE = /acotad|invadir|reducid|workaround|compressed/i;

describe("generatedPlanValidator", () => {
  it("passes with ok and zero warnings for current template", async () => {
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const strategy = await createMockStrategy(program, topology);
    const plan = await createGeneratedPlan();

    const validation = validateGeneratedPlan(plan, {
      strategy,
      topologyGraph: topology,
      hardAdjacencies: program.hardAdjacencies,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errors).toHaveLength(0);
    expect(validation.warnings.filter((w) => WORKAROUND_RE.test(w))).toHaveLength(
      0,
    );
    expect(
      validation.warnings.filter((w) => /bedroom.*height|compressed/i.test(w)),
    ).toHaveLength(0);
    expect(
      validation.warnings.filter((w) => /aspect ratio.*PATIO/i.test(w)),
    ).toHaveLength(0);
  });

  it("has no overlapping zones or out-of-bounds geometry", async () => {
    const plan = await createGeneratedPlan();
    for (const z of plan.zones) {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.width).toBeLessThanOrEqual(100);
      expect(z.y + z.height).toBeLessThanOrEqual(100);
    }
    for (let i = 0; i < plan.zones.length; i++) {
      for (let j = i + 1; j < plan.zones.length; j++) {
        expect(rectsOverlap(plan.zones[i]!, plan.zones[j]!)).toBe(false);
      }
    }
    const ids = plan.zones.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("validates doors with real wall contact (no corner-only satisfaction)", async () => {
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const plan = await createGeneratedPlan();
    const validation = validateGeneratedPlan(plan, {
      topologyGraph: topology,
    });

    for (const door of plan.doors) {
      expect(
        plan.zones.some((z) => z.sourceRoomId === door.from),
      ).toBe(true);
      expect(
        plan.zones.some((z) => z.sourceRoomId === door.to),
      ).toBe(true);
    }

    for (const check of validation.doorContactChecks) {
      if (check.satisfied) {
        expect(check.sharedWall).not.toBeNull();
        expect(check.overlapLength).toBeGreaterThanOrEqual(4);
        expect(check.message).not.toMatch(/esquina/i);
      }
    }

    const distribPrinDoor = validation.doorContactChecks.find(
      (c) => c.to === "DORMITORIO_PRINCIPAL",
    );
    expect(distribPrinDoor?.satisfied).toBe(true);
    expect(distribPrinDoor?.sharedWall).toBe("right");
    expect(distribPrinDoor!.overlapLength).toBeGreaterThanOrEqual(4);
  });

  it("validates hard adjacencies with real shared walls", async () => {
    const program = await createMockProgram();
    const topology = await createMockTopology(program);
    const plan = await createGeneratedPlan();
    const validation = validateGeneratedPlan(plan, {
      topologyGraph: topology,
    });

    const mustSatisfy = [
      ["ACCESO", "SALA_COMEDOR"],
      ["SALA_COMEDOR", "COCINA"],
      ["SALA_COMEDOR", "PATIO"],
      ["DISTRIBUIDOR", "DORMITORIO_2"],
      ["DISTRIBUIDOR", "DORMITORIO_3"],
      ["DISTRIBUIDOR", "BANIO"],
    ] as const;

    for (const [from, to] of mustSatisfy) {
      const check = findHardAdjacencyCheck(validation, from, to);
      expect(check, `${from} ↔ ${to}`).toBeDefined();
      expect(check!.satisfied).toBe(true);
      expect(check!.sharedWall).not.toBeNull();
      expect(check!.overlapLength).toBeGreaterThanOrEqual(4);
    }

    const distribPrin = findHardAdjacencyCheck(
      validation,
      "DISTRIBUIDOR",
      "DORMITORIO_PRINCIPAL",
    );
    expect(distribPrin?.satisfied).toBe(true);
    expect(distribPrin?.sharedWall).not.toBeNull();
    expect(distribPrin!.overlapLength).toBeGreaterThanOrEqual(4);
    expect(distribPrin?.message).not.toMatch(/esquina/i);
  });

  it("does not warn on PATIO aspect ratio 3.5 (outdoor max 4)", async () => {
    const plan = await createGeneratedPlan();
    const patio = findZone(plan, "PATIO")!;
    const aspect = patio.width / patio.height;
    expect(aspect).toBeCloseTo(3.5, 1);

    const validation = validateGeneratedPlan(plan);
    expect(
      validation.warnings.some(
        (w) => w.includes("PATIO") && w.includes("aspect ratio"),
      ),
    ).toBe(false);
  });
});
