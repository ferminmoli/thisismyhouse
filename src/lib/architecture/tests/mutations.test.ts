import { describe, expect, it } from "vitest";
import { PLAN_MUTATIONS, applyMutationPipeline } from "../mutations";
import { generatePlanVariants as generateAll } from "../variantGenerator";
import { zonesOverlapAny } from "../planNormalize";
import { rectsOverlap } from "../zoneGeometry";
import {
  createGeneratedPlan,
  createMockProgram,
  createMockTopology,
  findDoor,
  findHardAdjacencyCheck,
  findZone,
} from "./testHelpers";

function zoneArea(plan: Awaited<ReturnType<typeof createGeneratedPlan>>, room: string) {
  const z = findZone(plan, room);
  return z ? z.width * z.height : 0;
}

function uniqueMessages(messages: string[]) {
  return new Set(messages).size === messages.length;
}

describe("mutations", () => {
  it("defines all expected mutation types", () => {
    const types = PLAN_MUTATIONS.map((m) => m.type);
    expect(types).toHaveLength(10);
  });
});

describe("variant messages and effect", () => {
  it("has unique messages and effect.changed on every variant", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const variants = generateAll({ basePlan: base, topologyGraph: topology });

    for (const v of variants) {
      expect(uniqueMessages(v.messages)).toBe(true);
      expect(typeof v.effect.changed).toBe("boolean");
      expect(v).toHaveProperty("eligibleForRanking");
    }
  });

  it("eligibleForRanking only when status ok", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const variants = generateAll({ basePlan: base, topologyGraph: topology });

    for (const v of variants) {
      if (v.status === "ok") {
        expect(v.eligibleForRanking).toBe(true);
        if (v.mutationType === "base") {
          expect(v.effect.changed).toBe(false);
        } else {
          expect(v.effect.changed).toBe(true);
        }
      } else {
        expect(v.eligibleForRanking).toBe(false);
      }
    }
  });
});

describe("mirror_horizontal mutation", () => {
  it("keeps zones in canvas without overlaps and hard adjacencies", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "mirror_horizontal")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.status).toBe("ok");
    expect(result.effect.changed).toBe(true);

    for (const z of result.plan.zones) {
      expect(z.x).toBeGreaterThanOrEqual(0);
      expect(z.y).toBeGreaterThanOrEqual(0);
      expect(z.x + z.width).toBeLessThanOrEqual(100);
      expect(z.y + z.height).toBeLessThanOrEqual(100);
    }
    expect(zonesOverlapAny(result.plan.zones)).toBe(false);

    const socialPatio = findHardAdjacencyCheck(
      result.validation,
      "SALA_COMEDOR",
      "PATIO",
    );
    expect(socialPatio?.satisfied).toBe(true);
  });
});

describe("expand_patio mutation", () => {
  it("changes patio and stays ok", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "expand_patio")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.status).toBe("ok");
    expect(result.effect.changed).toBe(true);
    expect(result.effect.changedZones).toContain("PATIO");

    const patio = findZone(result.plan, "PATIO");
    const basePatio = findZone(base, "PATIO");
    expect(patio!.height).toBeGreaterThan(basePatio!.height);
  });
});

describe("expand_social mutation", () => {
  it("is ok with larger social area or skipped without fake warn", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "expand_social")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(["ok", "skipped"]).toContain(result.status);
    expect(result.status).not.toBe("warn");
    expect(uniqueMessages(result.messages)).toBe(true);

    if (result.status === "ok") {
      expect(zoneArea(result.plan, "SALA_COMEDOR")).toBeGreaterThan(
        zoneArea(base, "SALA_COMEDOR"),
      );
      expect(result.effect.changed).toBe(true);
      const check = findHardAdjacencyCheck(
        result.validation,
        "SALA_COMEDOR",
        "PATIO",
      );
      expect(check?.satisfied).toBe(true);
    } else {
      expect(result.effect.changed).toBe(false);
      expect(zoneArea(result.plan, "SALA_COMEDOR")).toBe(
        zoneArea(base, "SALA_COMEDOR"),
      );
    }
  });
});

describe("integrate_kitchen mutation", () => {
  it("widens passage and marks effect changed", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "integrate_kitchen")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.status).toBe("ok");
    expect(result.effect.changed).toBe(true);

    const door = findDoor(result.plan, "SALA_COMEDOR", "COCINA");
    expect(door!.width).toBeGreaterThanOrEqual(14);
    expect(door!.type).toBe("open_passage");
  });
});

describe("larger_master_bedroom mutation", () => {
  it("is ok with larger master or skipped", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "larger_master_bedroom")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(["ok", "skipped"]).toContain(result.status);
    expect(result.status).not.toBe("warn");

    if (result.status === "ok") {
      expect(zoneArea(result.plan, "DORMITORIO_PRINCIPAL")).toBeGreaterThan(
        zoneArea(base, "DORMITORIO_PRINCIPAL"),
      );
      expect(result.effect.changedZones).toContain("DORMITORIO_PRINCIPAL");
    } else {
      expect(result.effect.changed).toBe(false);
      expect(result.messages.some((m) => /máximo seguro/i.test(m))).toBe(true);
    }
  });
});

describe("compact_private_wing mutation", () => {
  it("is skipped and does not break hard adjacencies", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "compact_private_wing")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.status).toBe("skipped");
    expect(result.effect.changed).toBe(false);
    expect(result.eligibleForRanking).toBe(false);

    for (const c of result.validation.hardAdjacencyChecks) {
      expect(c.satisfied).toBe(true);
    }
    for (const c of result.validation.doorContactChecks) {
      expect(c.satisfied).toBe(true);
    }
  });
});

describe("gallery_patio mutation", () => {
  it("uses semi_outdoor zone not furniture", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "gallery_patio")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.plan.zones.some((z) => z.sourceRoomId === "GALERIA")).toBe(true);
    expect(result.plan.furniture.some((f) => f.id.includes("gallery"))).toBe(
      false,
    );
  });

  it("changes hints/notes with valid geometry", async () => {
    const base = await createGeneratedPlan();
    const program = await createMockProgram();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "gallery_patio")!;
    const result = applyMutationPipeline(base, topology, mutation, program);

    expect(result.status).toBe("ok");
    expect(result.effect.changed).toBe(true);

    const notes = result.plan.metadata.notes.join(" ").toLowerCase();
    expect(notes).toMatch(/galer[ií]a/);

    for (let i = 0; i < result.plan.zones.length; i++) {
      for (let j = i + 1; j < result.plan.zones.length; j++) {
        expect(rectsOverlap(result.plan.zones[i]!, result.plan.zones[j]!)).toBe(
          false,
        );
      }
    }
  });
});

describe("base mutation", () => {
  it("is ok and eligible", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const mutation = PLAN_MUTATIONS.find((m) => m.type === "base")!;
    const result = applyMutationPipeline(base, topology, mutation);

    expect(result.status).toBe("ok");
    expect(result.eligibleForRanking).toBe(true);
    expect(result.effect.changed).toBe(false);
    expect(result.validation.errors).toHaveLength(0);
    expect(result.validation.warnings).toHaveLength(0);
  });
});

describe("default variant set", () => {
  it("has at least 5 ok eligible variants", async () => {
    const base = await createGeneratedPlan();
    const topology = await createMockTopology();
    const variants = generateAll({ basePlan: base, topologyGraph: topology });
    const eligible = variants.filter((v) => v.eligibleForRanking);

    expect(eligible.length).toBeGreaterThanOrEqual(5);
    const types = eligible.map((v) => v.mutationType);
    expect(types).toContain("base");
    expect(types).toContain("mirror_horizontal");
    expect(types).toContain("expand_patio");
    expect(types).toContain("integrate_kitchen");
    expect(types).toContain("gallery_patio");
  });
});
