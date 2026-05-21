import type { PlanShape } from "@/lib/onboarding/user-preferences";
import type { ArchitecturalProgram } from "./types";

export function validateProgramSemantics(
  program: ArchitecturalProgram,
  expectedTargetM2: number,
  planShape?: PlanShape,
): string[] {
  const hints: string[] = [];
  const ids = new Set(program.programmaticZones.map((z) => z.id));

  if (program.programmaticZones.length < 3) {
    hints.push("programmaticZones: menos de 3 ambientes");
  }

  const uniqueIds = program.programmaticZones.map((z) => z.id);
  if (uniqueIds.length !== ids.size) {
    hints.push("programmaticZones: ids duplicados");
  }

  for (const edge of program.topologyGraph) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) {
      hints.push(
        `topologyGraph: referencia inválida ${edge.from}→${edge.to}`,
      );
    }
  }

  const sumIdeal = program.programmaticZones.reduce(
    (s, z) => s + z.idealAreaM2,
    0,
  );
  const target = program.globalConfig.targetTotalAreaM2;
  const ratio = sumIdeal / target;
  if (planShape === "l_shape") {
    if (sumIdeal > target + 0.5) {
      hints.push(
        `L: suma idealAreaM2 (${sumIdeal.toFixed(1)}) supera targetTotalAreaM2 (${target}) — debe ser <= objetivo`,
      );
    }
    if (ratio < 0.82) {
      hints.push(
        `L: suma idealAreaM2 (${sumIdeal.toFixed(1)}) muy baja vs target (${target})`,
      );
    }
  } else if (ratio < 0.88 || ratio > 1.18) {
    hints.push(
      `suma idealAreaM2 (${sumIdeal.toFixed(1)}) lejos de targetTotalAreaM2 (${target}) — ratio ${ratio.toFixed(2)}`,
    );
  }

  if (planShape === "l_shape") {
    for (const z of program.programmaticZones) {
      if (z.type === "outdoor" && z.exteriorAnchor === "front") {
        hints.push(
          `${z.id}: outdoor en L no debe usar exteriorAnchor "front"; usar back o any`,
        );
      }
      if (
        (z.id.includes("ACCESO") || z.id.includes("SALA")) &&
        z.exteriorAnchor === "back" &&
        z.type !== "outdoor"
      ) {
        hints.push(
          `${z.id}: acceso/sala en L debería priorizar exteriorAnchor "front"`,
        );
      }
    }
  }

  const targetDelta =
    Math.abs(program.globalConfig.targetTotalAreaM2 - expectedTargetM2) /
    expectedTargetM2;
  if (targetDelta > 0.08) {
    hints.push(
      `targetTotalAreaM2 (${target}) no coincide con preferencia del usuario (${expectedTargetM2})`,
    );
  }

  const privateZones = program.programmaticZones.filter(
    (z) => z.type === "private",
  );
  if (privateZones.length >= 2) {
    for (let i = 0; i < privateZones.length; i++) {
      for (let j = i + 1; j < privateZones.length; j++) {
        const direct = program.topologyGraph.some(
          (e) =>
            (e.from === privateZones[i].id && e.to === privateZones[j].id) ||
            (e.from === privateZones[j].id && e.to === privateZones[i].id),
        );
        if (direct) {
          hints.push(
            `dormitorios ${privateZones[i].id} y ${privateZones[j].id} no deben conectarse directamente`,
          );
        }
      }
    }
  }

  const hasCirculation = program.programmaticZones.some(
    (z) => z.type === "circulation",
  );
  if (program.programmaticZones.length >= 5 && !hasCirculation) {
    hints.push("falta al menos una zona circulation (pasillo/distribuidor)");
  }

  return hints;
}
