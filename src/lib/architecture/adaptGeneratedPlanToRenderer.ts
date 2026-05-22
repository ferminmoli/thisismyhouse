import type { ArchitecturalProgram as RendererProgram } from "@/lib/architectural-program/types";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import type { ArchitecturalProgram } from "./architecturalProgram";
import type { GeneratedPlan } from "./generatedPlan";
import type { TopologyGraph } from "./topologyGraph";

/** Escala lógica 0–100 → píxeles del canvas del renderer. */
export const PIPELINE_CANVAS_SCALE = 8;
export const PIPELINE_CANVAS_WIDTH = 100 * PIPELINE_CANVAS_SCALE;
export const PIPELINE_CANVAS_HEIGHT = 100 * PIPELINE_CANVAS_SCALE;

function snap(n: number): number {
  return Math.round(n);
}

function scaleUnit(v: number): number {
  return snap(v * PIPELINE_CANVAS_SCALE);
}

function mapRoomTypeToZoneType(
  type: ArchitecturalProgram["rooms"][number]["type"],
): PlacedZoneRect["type"] {
  if (type === "work" || type === "flex") return "social";
  if (type === "semi_outdoor") return "outdoor";
  return type;
}

function connectionToRelation(
  connection: string,
  strength: "hard" | "soft",
): RendererProgram["topologyGraph"][number]["relation"] {
  if (connection === "open_passage") return "open_concept";
  if (connection === "door") return "transition_door";
  if (connection === "shared_wall") return "direct_access";
  if (connection === "visual") return "visual_and_physical";
  return strength === "hard" ? "direct_access" : "nearby";
}

export function adaptArchitectureProgramToRenderer(
  program: ArchitecturalProgram,
  topologyGraph: TopologyGraph,
): RendererProgram {
  return {
    title: program.title,
    globalConfig: {
      targetTotalAreaM2: program.targetAreaM2 ?? 100,
      allowanceFactor: 1.15,
      notes: program.inputSummary,
    },
    programmaticZones: program.rooms.map((room) => ({
      id: room.id,
      label: room.label,
      type: mapRoomTypeToZoneType(room.type),
      idealAreaM2: room.idealAreaM2 ?? 10,
      aspectRatioRange: [0.75, 1.5] as [number, number],
      exteriorAnchor:
        room.type === "outdoor"
          ? "back"
          : room.id.includes("ACCESO")
            ? "front"
            : "any",
      priority:
        room.priority === "high" ? 3 : room.priority === "medium" ? 2 : 1,
    })),
    topologyGraph: topologyGraph.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      relation: connectionToRelation(edge.desiredConnection, edge.strength),
      strength: edge.strength === "hard" ? "critical" : "soft",
      reason: edge.reason,
    })),
    assumptions: program.limitations,
    openQuestions: program.architectQuestions,
  };
}

export function adaptGeneratedPlanToRenderer(
  plan: GeneratedPlan,
): FloorplanLayoutResult {
  const zones: PlacedZoneRect[] = plan.zones.map((z) => ({
    id: z.sourceRoomId,
    label: z.label,
    type: mapRoomTypeToZoneType(z.type),
    x: scaleUnit(z.x),
    y: scaleUnit(z.y),
    width: scaleUnit(z.width),
    height: scaleUnit(z.height),
  }));

  const buildableArea = zones.reduce((s, z) => s + z.width * z.height, 0);
  const containerArea =
    PIPELINE_CANVAS_WIDTH * PIPELINE_CANVAS_HEIGHT;

  return {
    zones,
    container: {
      shape: "l_shape",
      x: 0,
      y: 0,
      width: PIPELINE_CANVAS_WIDTH,
      height: PIPELINE_CANVAS_HEIGHT,
    },
    warnings: plan.metadata.warnings,
    fillRatio: buildableArea / containerArea,
    pxPerMeter: PIPELINE_CANVAS_WIDTH / 100,
    templateMeta: {
      templateId: plan.templateId,
      templateLabel: plan.metadata.templateName,
      selectionReason:
        "Parametric Parti Generator — curated l_shape_patio (pipeline step 3)",
      mappedRooms: plan.metadata.mapping.map((m) => {
        const zone = plan.zones.find((z) => z.sourceRoomId === m.roomId);
        return {
          slotId: m.slotId,
          zoneId: m.roomId,
          zoneLabel: m.roomLabel,
          zoneType: mapRoomTypeToZoneType(zone?.type ?? "social"),
        };
      }),
      unmappedRooms: [],
      ignoredSoftAdjacencies: [],
      validation: {
        ok: true,
        overlaps: [],
        outOfBounds: [],
        missingMappings: [],
        invalidDoorRefs: [],
        warnings: plan.metadata.warnings,
      },
    },
  };
}
