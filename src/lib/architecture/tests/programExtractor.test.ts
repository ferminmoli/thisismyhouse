import { describe, expect, it } from "vitest";
import { extractArchitecturalProgram } from "../programExtractor";
import {
  EXPECTED_DISCLAIMER,
  hasHardAdjacency,
  TEST_PROMPT,
  expectNoGeometryInProgram,
} from "./testHelpers";

describe("programExtractor", () => {
  it("returns semantic program only (mock, no geometry on rooms)", async () => {
    const { program, mock, model } = await extractArchitecturalProgram(TEST_PROMPT);

    expect(mock).toBe(true);
    expect(model).toBe("hardcoded-program-v1");
    expectNoGeometryInProgram(program);
  });

  it("has correct site vs desired plan shape", async () => {
    const { program } = await extractArchitecturalProgram(TEST_PROMPT);
    expect(program.desiredPlanShape).toBe("l_shape");
    expect(program.site.lotShape).toBe("unknown");
  });

  it("has PATIO high priority and hard ACCESO ↔ SALA_COMEDOR", async () => {
    const { program } = await extractArchitecturalProgram(TEST_PROMPT);
    const patio = program.rooms.find((r) => r.id === "PATIO");
    expect(patio?.priority).toBe("high");
    expect(hasHardAdjacency(program, "ACCESO", "SALA_COMEDOR")).toBe(true);
  });

  it("has expected adjacency counts and disclaimer", async () => {
    const { program } = await extractArchitecturalProgram(TEST_PROMPT);
    expect(program.hardAdjacencies).toHaveLength(7);
    expect(program.softAdjacencies).toHaveLength(3);
    expect(program.disclaimer).toBe(EXPECTED_DISCLAIMER);
  });

  it("does not call external LLM (mock warnings only)", async () => {
    const { warnings, rawJson } = await extractArchitecturalProgram(TEST_PROMPT);
    expect(warnings.some((w) => w.includes("mock"))).toBe(true);
    expect(rawJson).not.toContain('"x":');
    expect(rawJson).not.toMatch(/"width"\s*:\s*\d/);
  });
});
