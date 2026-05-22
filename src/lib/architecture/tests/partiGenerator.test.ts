import { describe, expect, it } from "vitest";
import { createGeneratedPlan, findZone } from "./testHelpers";

const WORKAROUND_RE = /acotad|invadir|reducid|shrunk|compressed/i;

describe("partiGenerator", () => {
  it("generates l_shape_patio plan with full fixture counts", async () => {
    const plan = await createGeneratedPlan();

    expect(plan.templateId).toBe("l_shape_patio");
    expect(plan.zones).toHaveLength(9);
    expect(plan.doors).toHaveLength(7);
    expect(plan.windows).toHaveLength(6);
    expect(plan.furniture).toHaveLength(9);
  });

  it("documents curated geometry source (no grid/LLM)", async () => {
    const plan = await createGeneratedPlan();
    const notes = plan.metadata.notes.join(" ");

    expect(notes).toContain("Geometry source: curated l_shape_patio template");
    expect(notes).toContain("LLM geometry: disabled");
    expect(notes).toContain("Grid engine: disabled");
    expect(notes).not.toMatch(/grid.?cell|bin.?pack/i);
  });

  it("maps DORMITORIO_2 with adequate size and no workaround notes", async () => {
    const plan = await createGeneratedPlan();
    const dorm2 = findZone(plan, "DORMITORIO_2");

    expect(dorm2).toBeDefined();
    expect(dorm2!.width).toBeGreaterThanOrEqual(18);
    expect(dorm2!.height).toBeGreaterThanOrEqual(14);
    expect(dorm2!.height).not.toBe(11);
    expect(dorm2!.notes ?? "").not.toMatch(WORKAROUND_RE);
  });

  it("has generous social zone and high-priority patio", async () => {
    const plan = await createGeneratedPlan();
    const sala = findZone(plan, "SALA_COMEDOR");
    const patio = findZone(plan, "PATIO");

    expect(sala!.width).toBeGreaterThanOrEqual(28);
    expect(sala!.height).toBeGreaterThanOrEqual(20);
    expect(patio!.type).toBe("outdoor");
    expect(patio!.priority).toBe("high");
  });

  it("maps all required mock rooms to slots", async () => {
    const plan = await createGeneratedPlan();
    const requiredIds = [
      "ACCESO",
      "SALA_COMEDOR",
      "COCINA",
      "DORMITORIO_PRINCIPAL",
      "DORMITORIO_2",
      "DORMITORIO_3",
      "BANIO",
      "DISTRIBUIDOR",
      "PATIO",
    ];
    for (const id of requiredIds) {
      expect(findZone(plan, id), `missing zone ${id}`).toBeDefined();
    }
    expect(plan.metadata.mapping).toHaveLength(9);
  });
});
