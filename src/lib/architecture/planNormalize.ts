import type {
  FurnitureHint,
  GeneratedPlan,
  RenderDoor,
  RenderWindow,
  RenderZone,
} from "./generatedPlan";
import type { TopologyGraph } from "./topologyGraph";
import { analyzeZoneAdjacency } from "./zoneGeometry";
import { inferDesiredConnection } from "./topologyGraphBuilder";
import type { ProgramRoom } from "./architecturalProgram";
import { rectsOverlap } from "./zoneGeometry";

const CANVAS = 100;

function norm(id: string): string {
  return id.trim().toUpperCase();
}

export function clonePlan(plan: GeneratedPlan): GeneratedPlan {
  return structuredClone(plan);
}

export function findZoneByRoom(
  zones: RenderZone[],
  roomId: string,
): RenderZone | undefined {
  const n = norm(roomId);
  return zones.find((z) => norm(z.sourceRoomId) === n);
}

function swapWall(
  wall: RenderDoor["wall"],
): RenderDoor["wall"] {
  if (wall === "left") return "right";
  if (wall === "right") return "left";
  return wall;
}

function connectionToDoorType(
  connection: string,
): RenderDoor["type"] {
  if (connection === "open_passage") return "open_passage";
  if (connection === "sliding") return "sliding";
  return "door";
}

function defaultDoorWidth(type: RenderDoor["type"]): number {
  if (type === "open_passage") return 12;
  if (type === "sliding") return 18;
  return 6;
}

/** Regenera puertas desde aristas hard del grafo y geometría actual de zonas. */
export function regenerateDoorsFromTopology(
  topologyGraph: TopologyGraph,
  zones: RenderZone[],
): RenderDoor[] {
  const zoneByRoom = Object.fromEntries(
    zones.map((z) => [norm(z.sourceRoomId), z]),
  );
  const doors: RenderDoor[] = [];
  let i = 0;

  const hasGallery = Boolean(findZoneByRoom(zones, "GALERIA"));

  for (const edge of topologyGraph.edges.filter((e) => e.strength === "hard")) {
    const from = norm(edge.from);
    const to = norm(edge.to);
    if (
      hasGallery &&
      ((from === "SALA_COMEDOR" && to === "PATIO") ||
        (from === "PATIO" && to === "SALA_COMEDOR"))
    ) {
      continue;
    }

    const za = zoneByRoom[from];
    const zb = zoneByRoom[to];
    if (!za || !zb) continue;

    const geo = analyzeZoneAdjacency(za, zb);
    if (!geo.touches || geo.wallOnA == null) continue;

    const type = connectionToDoorType(edge.desiredConnection);
    doors.push({
      id: `door_${i++}_${from}_${to}`,
      from,
      to,
      type,
      wall: geo.wallOnA,
      position: 50,
      width: defaultDoorWidth(type),
    });
  }

  if (hasGallery) {
    for (const [from, to] of [
      ["SALA_COMEDOR", "GALERIA"],
      ["GALERIA", "PATIO"],
    ] as const) {
      const za = zoneByRoom[from];
      const zb = zoneByRoom[to];
      if (!za || !zb) continue;
      const geo = analyzeZoneAdjacency(za, zb);
      if (!geo.touches || geo.wallOnA == null) continue;
      const type = connectionToDoorType(
        from === "SALA_COMEDOR" ? "open_passage" : "open_passage",
      );
      doors.push({
        id: `door_${i++}_${from}_${to}`,
        from,
        to,
        type,
        wall: geo.wallOnA,
        position: 50,
        width: defaultDoorWidth(type),
      });
    }
  }

  return doors;
}

function clampToZone(
  value: number,
  zoneStart: number,
  zoneSize: number,
  itemSize: number,
): number {
  const maxStart = zoneStart + zoneSize - itemSize;
  return Math.max(zoneStart, Math.min(value, maxStart));
}

/** Mantiene ventanas en muros exteriores válidos de cada zona. */
export function clampWindowsToZones(
  windows: RenderWindow[],
  zones: RenderZone[],
): RenderWindow[] {
  const zoneByRoom = Object.fromEntries(
    zones.map((z) => [norm(z.sourceRoomId), z]),
  );
  return windows
    .map((w) => {
      const z = zoneByRoom[norm(w.zoneId)];
      if (!z) return null;
      return {
        ...w,
        zoneId: norm(w.zoneId),
        position: Math.max(5, Math.min(95, w.position)),
        width: Math.min(w.width, z.width * 0.6),
      };
    })
    .filter((w): w is RenderWindow => w != null);
}

/** Mantiene mobiliario dentro de los límites de su zona. */
export function clampFurnitureToZones(
  furniture: FurnitureHint[],
  zones: RenderZone[],
): FurnitureHint[] {
  const zoneByRoom = Object.fromEntries(
    zones.map((z) => [norm(z.sourceRoomId), z]),
  );
  return furniture
    .map((f) => {
      const z = zoneByRoom[norm(f.zoneId)];
      if (!z) return null;
      return {
        ...f,
        zoneId: norm(f.zoneId),
        x: clampToZone(f.x, z.x, z.width, f.width),
        y: clampToZone(f.y, z.y, z.height, f.height),
      };
    })
    .filter((f): f is FurnitureHint => f != null);
}

export function mirrorPlanHorizontal(plan: GeneratedPlan): GeneratedPlan {
  const zones = plan.zones.map((z) => ({
    ...z,
    x: CANVAS - z.x - z.width,
  }));
  const furniture = plan.furniture.map((f) => ({
    ...f,
    x: CANVAS - f.x - f.width,
  }));
  const doors = plan.doors.map((d) => ({
    ...d,
    wall: swapWall(d.wall),
  }));
  const windows = plan.windows.map((w) => ({
    ...w,
    wall: swapWall(w.wall),
  }));
  return { ...plan, zones, furniture, doors, windows };
}

export function zonesOverlapAny(zones: RenderZone[]): boolean {
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlap(zones[i]!, zones[j]!)) return true;
    }
  }
  return false;
}

export function tryExpandZone(
  zones: RenderZone[],
  roomId: string,
  delta: { dw?: number; dh?: number; dx?: number; dy?: number },
): { ok: boolean; message?: string } {
  const next = zones.map((z) => ({ ...z }));
  const z = findZoneByRoom(next, roomId);
  if (!z) return { ok: false, message: `Zona ${roomId} no encontrada` };

  if (delta.dx != null) z.x += delta.dx;
  if (delta.dy != null) z.y += delta.dy;
  if (delta.dw != null) z.width += delta.dw;
  if (delta.dh != null) z.height += delta.dh;

  if (z.x < 0 || z.y < 0 || z.x + z.width > CANVAS || z.y + z.height > CANVAS) {
    return { ok: false, message: `${roomId}: expansión fuera de canvas` };
  }
  if (zonesOverlapAny(next)) {
    return { ok: false, message: `${roomId}: expansión genera solape` };
  }

  Object.assign(
    findZoneByRoom(zones, roomId)!,
    z,
  );
  return { ok: true };
}

export function normalizePlanAfterMutation(
  plan: GeneratedPlan,
  topologyGraph: TopologyGraph,
  mutationNote: string,
): GeneratedPlan {
  const notes = [
    ...plan.metadata.notes.filter(
      (n) => !n.startsWith("Mutation:"),
    ),
    `Mutation: ${mutationNote}`,
  ];

  const doors = regenerateDoorsFromTopology(topologyGraph, plan.zones);
  const windows = clampWindowsToZones(plan.windows, plan.zones);
  const furniture = clampFurnitureToZones(plan.furniture, plan.zones);

  return {
    ...plan,
    id: `${plan.id}_${mutationNote.replace(/\s+/g, "_").toLowerCase()}`,
    doors,
    windows,
    furniture,
    metadata: {
      ...plan.metadata,
      notes,
      warnings: [...plan.metadata.warnings],
    },
  };
}

/** Stub room for inferDesiredConnection when regenerating custom door tweaks. */
export function zoneAsProgramRoom(z: RenderZone): ProgramRoom {
  return {
    id: z.sourceRoomId,
    label: z.label,
    type: z.type,
    required: true,
    priority: z.priority,
  };
}

export function inferDoorBetweenZones(
  zones: RenderZone[],
  from: string,
  to: string,
): RenderDoor | null {
  const za = findZoneByRoom(zones, from);
  const zb = findZoneByRoom(zones, to);
  if (!za || !zb) return null;
  const geo = analyzeZoneAdjacency(za, zb);
  if (!geo.wallOnA) return null;
  const connection = inferDesiredConnection(
    zoneAsProgramRoom(za),
    zoneAsProgramRoom(zb),
    "hard",
  );
  const type = connectionToDoorType(connection);
  return {
    id: `door_${norm(from)}_${norm(to)}`,
    from: norm(from),
    to: norm(to),
    type,
    wall: geo.wallOnA,
    position: 50,
    width: defaultDoorWidth(type),
  };
}
