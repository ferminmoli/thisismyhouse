import type { Adjacency, ArchitecturalProgram } from "./architecturalProgram";
import {
  issuesToValidationStrings,
  validateArchitecturalDesign,
} from "./architecturalValidation";
import type {
  GeneratedPlan,
  GeneratedPlanValidation,
  RenderDoor,
  RenderZone,
} from "./generatedPlan";
import type { ArchitecturalStrategy } from "./strategySelector";
import type { TopologyGraph } from "./topologyGraph";
import { evaluateZoneDimensions } from "./dimensionalRules";
import {
  analyzeZoneAdjacency,
  hasRealSharedWall,
  MIN_SHARED_WALL_LENGTH,
  rectsOverlap,
} from "./zoneGeometry";

const MIN_BEDROOM_HEIGHT = 14;
const MIN_BEDROOM_WIDTH = 18;

function requiresWallSegment(desiredConnection: string): boolean {
  return (
    desiredConnection === "door" ||
    desiredConnection === "open_passage" ||
    desiredConnection === "shared_wall"
  );
}

const WORKAROUND_NOTE_RE =
  /acotad|invadir|reducid|workaround|colisi[oó]n|comprimid|ajustad/i;

function findZone(zones: RenderZone[], roomId: string): RenderZone | undefined {
  const n = roomId.trim().toUpperCase();
  return zones.find((z) => z.sourceRoomId.toUpperCase() === n);
}

function hasWorkaroundLanguage(text: string): boolean {
  return WORKAROUND_NOTE_RE.test(text);
}

function collectHardEdges(
  plan: GeneratedPlan,
  topologyGraph?: TopologyGraph,
): Array<{ from: string; to: string; desiredConnection: string }> {
  if (topologyGraph) {
    return topologyGraph.edges
      .filter((e) => e.strength === "hard")
      .map((e) => ({
        from: e.from,
        to: e.to,
        desiredConnection: e.desiredConnection,
      }));
  }
  return [];
}

function adjustHardChecksForGalleryTransition(
  zones: RenderZone[],
  checks: GeneratedPlanValidation["hardAdjacencyChecks"],
): GeneratedPlanValidation["hardAdjacencyChecks"] {
  const hasGallery = findZone(zones, "GALERIA");
  if (!hasGallery) return checks;

  const chainOk = (a: string, b: string) => {
    const za = findZone(zones, a);
    const zb = findZone(zones, b);
    if (!za || !zb) return false;
    const geo = analyzeZoneAdjacency(za, zb);
    return hasRealSharedWall(geo, MIN_SHARED_WALL_LENGTH);
  };

  return checks.map((c) => {
    const isSocialPatio =
      (c.from === "SALA_COMEDOR" && c.to === "PATIO") ||
      (c.from === "PATIO" && c.to === "SALA_COMEDOR");
    if (!isSocialPatio) return c;
    if (
      chainOk("SALA_COMEDOR", "GALERIA") &&
      chainOk("GALERIA", "PATIO")
    ) {
      return {
        ...c,
        satisfied: true,
        message: "SALA ↔ PATIO vía GALERIA semi-cubierta.",
      };
    }
    return c;
  });
}

export function validateHardAdjacencyGeometry(
  zones: RenderZone[],
  hardEdges: Array<{ from: string; to: string; desiredConnection: string }>,
): GeneratedPlanValidation["hardAdjacencyChecks"] {
  return hardEdges.map((edge) => {
    const za = findZone(zones, edge.from);
    const zb = findZone(zones, edge.to);
    if (!za || !zb) {
      return {
        from: edge.from,
        to: edge.to,
        desiredConnection: edge.desiredConnection,
        satisfied: false,
        sharedWall: null,
        overlapLength: 0,
        message: `Zona ausente (${!za ? edge.from : edge.to}).`,
      };
    }
    const geo = analyzeZoneAdjacency(za, zb);
    const needsWall = requiresWallSegment(edge.desiredConnection);
    const satisfied = needsWall
      ? hasRealSharedWall(geo, MIN_SHARED_WALL_LENGTH)
      : hasRealSharedWall(geo, 2);
    return {
      from: edge.from,
      to: edge.to,
      desiredConnection: edge.desiredConnection,
      satisfied,
      sharedWall: geo.wallOnA,
      overlapLength: geo.overlapLength,
      message: satisfied
        ? geo.message
        : geo.sharedWall == null
          ? `${geo.message} Hard adjacency requiere muro compartido (≥${MIN_SHARED_WALL_LENGTH}), no esquina.`
          : `${geo.message} Solape insuficiente (mín. ${MIN_SHARED_WALL_LENGTH}).`,
    };
  });
}

export function validateDoorContacts(
  zones: RenderZone[],
  doors: RenderDoor[],
): GeneratedPlanValidation["doorContactChecks"] {
  return doors.map((door) => {
    const za = findZone(zones, door.from);
    const zb = findZone(zones, door.to);
    if (!za || !zb) {
      return {
        doorId: door.id,
        from: door.from,
        to: door.to,
        type: door.type,
        wall: door.wall,
        satisfied: false,
        sharedWall: null,
        overlapLength: 0,
        message: "Puerta referencia zona inexistente.",
      };
    }
    const geo = analyzeZoneAdjacency(za, zb);
    if (!geo.touches) {
      return {
        doorId: door.id,
        from: door.from,
        to: door.to,
        type: door.type,
        wall: door.wall,
        satisfied: false,
        sharedWall: null,
        overlapLength: 0,
        message: "Las habitaciones de la puerta no comparten muro.",
      };
    }
    if (geo.sharedWall == null) {
      return {
        doorId: door.id,
        from: door.from,
        to: door.to,
        type: door.type,
        wall: door.wall,
        satisfied: false,
        sharedWall: null,
        overlapLength: geo.overlapLength,
        message: `${geo.message} Puerta requiere segmento de muro, no esquina.`,
      };
    }
    const minSpan = Math.max(
      MIN_SHARED_WALL_LENGTH,
      door.type === "open_passage" ? door.width : Math.max(door.width, 4),
    );
    const wallOk = geo.wallOnA === door.wall;
    const spanOk = geo.overlapLength >= minSpan;
    const satisfied = wallOk && spanOk;
    return {
      doorId: door.id,
      from: door.from,
      to: door.to,
      type: door.type,
      wall: door.wall,
      satisfied,
      sharedWall: geo.wallOnA,
      overlapLength: geo.overlapLength,
      message: satisfied
        ? `Puerta en muro ${door.wall} de ${door.from} (${geo.message})`
        : !wallOk
          ? `Puerta declara wall=${door.wall} pero el muro compartido es ${geo.wallOnA}.`
          : `Solape ${geo.overlapLength} < mínimo ${minSpan} (door.width=${door.width}).`,
    };
  });
}

export type ValidateGeneratedPlanOptions = {
  strategy?: ArchitecturalStrategy;
  program?: ArchitecturalProgram;
  hardAdjacencies?: Adjacency[];
  topologyGraph?: TopologyGraph;
};

export function validateGeneratedPlan(
  plan: GeneratedPlan,
  options?: ValidateGeneratedPlanOptions,
): GeneratedPlanValidation {
  const errors: string[] = [];
  const warnings: string[] = [...plan.metadata.warnings];

  const hardEdges =
    options?.topologyGraph != null
      ? collectHardEdges(plan, options.topologyGraph)
      : (options?.hardAdjacencies ?? []).map((a) => ({
          from: a.from,
          to: a.to,
          desiredConnection: "hard",
        }));

  const zoneIds = new Set<string>();
  for (const z of plan.zones) {
    if (zoneIds.has(z.id)) {
      errors.push(`Duplicate zone id: ${z.id}`);
    }
    zoneIds.add(z.id);

    if (z.x < 0 || z.y < 0 || z.x + z.width > 100 || z.y + z.height > 100) {
      errors.push(`Zone ${z.sourceRoomId} outside 0–100 canvas.`);
    }

    if (z.type === "private") {
      if (z.height < MIN_BEDROOM_HEIGHT) {
        warnings.push(
          `Bedroom ${z.sourceRoomId} height ${z.height} < ${MIN_BEDROOM_HEIGHT}.`,
        );
      }
      if (z.width < MIN_BEDROOM_WIDTH) {
        warnings.push(
          `Bedroom ${z.sourceRoomId} width ${z.width} < ${MIN_BEDROOM_WIDTH}.`,
        );
      }
    }

    const dim = evaluateZoneDimensions(z);
    if (dim.aspectExceeded) {
      warnings.push(
        `Zone ${z.sourceRoomId} aspect ratio ${dim.aspect.toFixed(1)} > ${dim.rule.maxAspectRatio} (${dim.rule.ruleSet}).`,
      );
    }
    if (dim.minimumDepthFailed) {
      warnings.push(
        `Zone ${z.sourceRoomId} gallery transition depth below minimum.`,
      );
    }

    if (z.notes && hasWorkaroundLanguage(z.notes)) {
      warnings.push(
        `Zone ${z.sourceRoomId} note contains geometry workaround language.`,
      );
    }
  }

  for (const note of plan.metadata.notes) {
    if (hasWorkaroundLanguage(note)) {
      warnings.push("Plan metadata note contains workaround language.");
    }
  }

  for (let i = 0; i < plan.zones.length; i++) {
    for (let j = i + 1; j < plan.zones.length; j++) {
      if (rectsOverlap(plan.zones[i]!, plan.zones[j]!)) {
        errors.push(
          `Overlapping zones: ${plan.zones[i]!.sourceRoomId} ↔ ${plan.zones[j]!.sourceRoomId}`,
        );
      }
    }
  }

  const roomIds = new Set(plan.zones.map((z) => z.sourceRoomId));
  for (const m of plan.metadata.mapping) {
    if (!roomIds.has(m.roomId)) {
      errors.push(`Mapping references unmapped zone: ${m.roomId}`);
    }
  }

  for (const door of plan.doors) {
    if (!roomIds.has(door.from) || !roomIds.has(door.to)) {
      errors.push(`Door references missing zone: ${door.from} → ${door.to}`);
    }
  }

  for (const win of plan.windows) {
    if (!roomIds.has(win.zoneId)) {
      errors.push(`Window references missing zone: ${win.zoneId}`);
    }
  }

  let hardAdjacencyChecks = validateHardAdjacencyGeometry(
    plan.zones,
    hardEdges,
  );
  hardAdjacencyChecks = adjustHardChecksForGalleryTransition(
    plan.zones,
    hardAdjacencyChecks,
  );
  const hasGalleryZone = Boolean(findZone(plan.zones, "GALERIA"));
  for (const check of hardAdjacencyChecks) {
    if (!check.satisfied) {
      const isSocialPatio =
        (check.from === "SALA_COMEDOR" && check.to === "PATIO") ||
        (check.from === "PATIO" && check.to === "SALA_COMEDOR");
      if (hasGalleryZone && isSocialPatio) continue;
      warnings.push(
        `Hard adjacency ${check.from} ↔ ${check.to}: ${check.message}`,
      );
    }
  }

  const doorContactChecks = validateDoorContacts(plan.zones, plan.doors);
  for (const check of doorContactChecks) {
    if (!check.satisfied) {
      const isSocialPatioDoor =
        (check.from === "SALA_COMEDOR" && check.to === "PATIO") ||
        (check.from === "PATIO" && check.to === "SALA_COMEDOR");
      if (hasGalleryZone && isSocialPatioDoor) continue;
      warnings.push(`Door ${check.from} → ${check.to}: ${check.message}`);
    }
  }

  if (options?.strategy?.constraints.needsPatio && !findZone(plan.zones, "PATIO")) {
    errors.push("Strategy requires patio but PATIO zone is missing.");
  }

  const architecturalIssues =
    options?.program && options?.topologyGraph
      ? validateArchitecturalDesign(
          plan,
          options.program,
          options.topologyGraph,
          hardAdjacencyChecks,
        )
      : [];

  const archStrings = issuesToValidationStrings(architecturalIssues);
  errors.push(...archStrings.errors);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    infos: archStrings.infos,
    architecturalIssues,
    hardAdjacencyChecks,
    doorContactChecks,
  };
}
