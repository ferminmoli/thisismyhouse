import type {
  Adjacency,
  ArchitecturalProgram,
  ProgramRoom,
  RoomType,
} from "./architecturalProgram";
import type {
  DesiredConnection,
  TopologyCluster,
  TopologyClusterType,
  TopologyEdge,
  TopologyGraph,
  TopologyGraphValidation,
  TopologyNode,
} from "./topologyGraph";

const CLUSTER_META: Record<
  TopologyClusterType,
  { label: string; defaultNotes: string[] }
> = {
  access_cluster: {
    label: "Acceso",
    defaultNotes: [
      "Entry sequence controls privacy and first impression of the plan.",
    ],
  },
  social_cluster: {
    label: "Núcleo social",
    defaultNotes: [
      "Living and dining anchor daylight and connection to outdoor spaces.",
    ],
  },
  private_cluster: {
    label: "Zona íntima",
    defaultNotes: [
      "Bedrooms were grouped to support privacy and reduce exposure to social noise.",
    ],
  },
  service_cluster: {
    label: "Servicios",
    defaultNotes: [
      "Kitchen and wet rooms support daily routines and service adjacencies.",
    ],
  },
  outdoor_cluster: {
    label: "Exterior",
    defaultNotes: [
      "Outdoor rooms extend the social area and capture light and ventilation.",
    ],
  },
  circulation_cluster: {
    label: "Circulación",
    defaultNotes: [
      "Hallways and distributors connect private and service zones without crossing the social core.",
    ],
  },
  mixed_cluster: {
    label: "Mixto",
    defaultNotes: ["Ambiguous or flexible rooms grouped for layout flexibility."],
  },
};

function norm(id: string): string {
  return id.trim().toUpperCase();
}

function roomKey(room: ProgramRoom): string {
  return norm(room.id);
}

export function isSocial(room: ProgramRoom): boolean {
  return (
    room.type === "social" ||
    /SALA|LIVING|COMEDOR|ESTAR|SOCIAL/i.test(room.id)
  );
}

export function isPrivate(room: ProgramRoom): boolean {
  return (
    room.type === "private" ||
    /DORMITORIO|BEDROOM|SUITE/i.test(room.id)
  );
}

export function isService(room: ProgramRoom): boolean {
  return (
    room.type === "service" ||
    /COCINA|BANIO|BAÑO|LAVADERO|STORAGE|LAVANDER/i.test(room.id)
  );
}

export function isOutdoor(room: ProgramRoom): boolean {
  return (
    room.type === "outdoor" ||
    /PATIO|PARRILLA|GARDEN|JARDIN|EXTERIOR/i.test(room.id)
  );
}

export function isSemiOutdoor(room: ProgramRoom): boolean {
  return (
    room.type === "semi_outdoor" ||
    /GALERIA|GALERÍA|QUINCHO|PORCH/i.test(room.id)
  );
}

export function isCirculation(room: ProgramRoom): boolean {
  return (
    room.type === "circulation" ||
    /DISTRIBUIDOR|PASILLO|HALL|CIRCULACION/i.test(room.id)
  );
}

export function isAccess(room: ProgramRoom): boolean {
  return (
    /ACCESO|FOYER|ENTRANCE|INGRESO|RECIBIDOR/i.test(room.id) ||
    (room.type === "circulation" && /ACCESO|ENTRADA/i.test(room.label))
  );
}

function clusterTypeFromRoom(room: ProgramRoom): TopologyClusterType {
  const id = norm(room.id);

  if (isAccess(room)) return "access_cluster";
  if (/SALA|LIVING|COMEDOR|ESTAR/.test(id) || room.type === "social") {
    return "social_cluster";
  }
  if (/DORMITORIO|BEDROOM/.test(id) || room.type === "private") {
    return "private_cluster";
  }
  if (/COCINA|BANIO|BAÑO|LAVADERO|STORAGE|LAVANDER/.test(id) || room.type === "service") {
    return "service_cluster";
  }
  if (isSemiOutdoor(room)) return "outdoor_cluster";
  if (/PATIO|PARRILLA|GARDEN|JARDIN/.test(id) || room.type === "outdoor") {
    return "outdoor_cluster";
  }
  if (room.type === "circulation") {
    return isAccess(room) ? "access_cluster" : "mixed_cluster";
  }
  return "mixed_cluster";
}

export function assignClusterId(room: ProgramRoom): string {
  const id = norm(room.id);
  if (/DISTRIBUIDOR|PASILLO|HALL/.test(id)) return "circulation_cluster";
  return clusterTypeFromRoom(room);
}

export function inferDesiredConnection(
  from: ProgramRoom,
  to: ProgramRoom,
  strength: "hard" | "soft",
): DesiredConnection {
  const a = roomKey(from);
  const b = roomKey(to);

  const pair = (x: string, y: string) =>
    (a.includes(x) && b.includes(y)) || (a.includes(y) && b.includes(x));

  if (pair("SALA", "COCINA") || (isSocial(from) && isService(to) && /COCINA/.test(b + a))) {
    return "open_passage";
  }

  if (pair("SALA", "PATIO") || (isSocial(from) && isOutdoor(to))) {
    return strength === "hard" ? "open_passage" : "visual";
  }

  if (
    (/DISTRIBUIDOR/.test(a) || /DISTRIBUIDOR/.test(b)) &&
    (isPrivate(from) || isPrivate(to))
  ) {
    return "door";
  }

  if (
    (/DISTRIBUIDOR/.test(a) || /DISTRIBUIDOR/.test(b)) &&
    (/BANIO|BAÑO/.test(a) || /BANIO|BAÑO/.test(b))
  ) {
    return "door";
  }

  if (pair("COCINA", "PATIO") || (isService(from) && isOutdoor(to))) {
    return strength === "hard" ? "shared_wall" : "near";
  }

  if (
    (isPrivate(from) && /BANIO|BAÑO/.test(b)) ||
    (isPrivate(to) && /BANIO|BAÑO/.test(a))
  ) {
    return "near";
  }

  if (
    (isAccess(from) && isSocial(to)) ||
    (isAccess(to) && isSocial(from))
  ) {
    return strength === "hard" ? "open_passage" : "door";
  }

  if (strength === "hard") {
    if (isSocial(from) && isSocial(to)) return "open_passage";
    if (isCirculation(from) || isCirculation(to)) return "door";
    return "shared_wall";
  }

  if (isOutdoor(from) || isOutdoor(to)) return "visual";
  return "near";
}

export function weightForEdge(
  strength: "hard" | "soft",
  desiredConnection: DesiredConnection,
): number {
  if (strength === "hard") {
    if (desiredConnection === "open_passage") return 100;
    if (desiredConnection === "door") return 90;
    if (desiredConnection === "shared_wall") return 80;
    if (desiredConnection === "visual") return 25;
    if (desiredConnection === "near") return 40;
  }
  if (desiredConnection === "near") return 30;
  if (desiredConnection === "visual") return 20;
  if (desiredConnection === "door") return 35;
  if (desiredConnection === "open_passage") return 45;
  return 25;
}

function edgeId(from: string, to: string, strength: string): string {
  const [a, b] = [norm(from), norm(to)].sort();
  return `edge_${a}__${b}__${strength}`;
}

function roomById(
  rooms: ProgramRoom[],
  id: string,
): ProgramRoom | undefined {
  const n = norm(id);
  return rooms.find((r) => norm(r.id) === n);
}

function adjacencyToEdge(
  adj: Adjacency,
  rooms: ProgramRoom[],
  warnings: string[],
): TopologyEdge | null {
  const fromRoom = roomById(rooms, adj.from);
  const toRoom = roomById(rooms, adj.to);
  if (!fromRoom || !toRoom) {
    warnings.push(`Adjacency skipped: missing room ${adj.from} or ${adj.to}`);
    return null;
  }

  const strength = adj.strength;
  let desiredConnection = inferDesiredConnection(fromRoom, toRoom, strength);
  let weight = weightForEdge(strength, desiredConnection);

  const a = norm(fromRoom.id);
  const b = norm(toRoom.id);
  const isAccesoSala =
    (a.includes("ACCESO") && b.includes("SALA")) ||
    (b.includes("ACCESO") && a.includes("SALA"));
  if (isAccesoSala && strength === "hard") {
    desiredConnection = "open_passage";
    weight = 90;
  }

  return {
    id: edgeId(adj.from, adj.to, strength),
    from: norm(fromRoom.id),
    to: norm(toRoom.id),
    strength,
    reason: adj.reason,
    desiredConnection,
    weight,
  };
}

function clusterPriority(roomIds: string[], nodes: TopologyNode[]): "low" | "medium" | "high" {
  const priorities = nodes
    .filter((n) => roomIds.includes(n.roomId))
    .map((n) => n.priority);
  if (priorities.some((p) => p === "high")) return "high";
  if (priorities.some((p) => p === "medium")) return "medium";
  return "low";
}

function buildClusters(nodes: TopologyNode[]): TopologyCluster[] {
  const byCluster = new Map<string, TopologyNode[]>();
  for (const node of nodes) {
    const list = byCluster.get(node.clusterId) ?? [];
    list.push(node);
    byCluster.set(node.clusterId, list);
  }

  const clusters: TopologyCluster[] = [];

  for (const [clusterId, clusterNodes] of byCluster) {
    const type = (
      clusterId in CLUSTER_META ? clusterId : "mixed_cluster"
    ) as TopologyClusterType;
    const meta = CLUSTER_META[type];

    clusters.push({
      id: clusterId,
      label: meta.label,
      type,
      roomIds: clusterNodes.map((n) => n.roomId),
      priority: clusterPriority(
        clusterNodes.map((n) => n.roomId),
        nodes,
      ),
      notes: [...meta.defaultNotes],
    });
  }

  return clusters.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildTopologyGraph(program: ArchitecturalProgram): TopologyGraph {
  const warnings: string[] = [];

  const nodes: TopologyNode[] = program.rooms.map((room) => ({
    id: `node_${norm(room.id)}`,
    roomId: norm(room.id),
    label: room.label,
    type: room.type,
    required: room.required,
    priority: room.priority,
    clusterId: assignClusterId(room),
  }));

  const edges: TopologyEdge[] = [];
  const seenHard = new Set<string>();

  for (const adj of program.hardAdjacencies) {
    const edge = adjacencyToEdge(adj, program.rooms, warnings);
    if (!edge) continue;
    const key = `${edge.from}::${edge.to}`;
    if (seenHard.has(key)) {
      warnings.push(`Duplicate hard edge ignored: ${edge.from} ↔ ${edge.to}`);
      continue;
    }
    seenHard.add(key);
    edges.push(edge);
  }

  const seenSoft = new Set<string>();
  for (const adj of program.softAdjacencies) {
    const edge = adjacencyToEdge(adj, program.rooms, warnings);
    if (!edge) continue;
    const key = [edge.from, edge.to].sort().join("::");
    if (seenSoft.has(key)) continue;
    seenSoft.add(key);
    edges.push(edge);
  }

  const inferredSoft = inferTechnicalSoftAdjacencies(program.rooms);
  for (const adj of inferredSoft) {
    const key = [norm(adj.from), norm(adj.to)].sort().join("::");
    if (seenSoft.has(key)) continue;
    const edge = adjacencyToEdge(adj, program.rooms, warnings);
    if (edge) {
      seenSoft.add(key);
      edges.push(edge);
    }
  }

  const clusters = buildClusters(nodes);

  return { nodes, edges, clusters, warnings };
}

/** Aristas técnicas/costo no declaradas explícitamente en el brief. */
function inferTechnicalSoftAdjacencies(
  rooms: ProgramRoom[],
): Adjacency[] {
  const ids = new Set(rooms.map((r) => norm(r.id)));
  const has = (id: string) => ids.has(norm(id));
  const edges: Adjacency[] = [];

  if (has("BANIO") && has("COCINA")) {
    edges.push({
      from: "BANIO",
      to: "COCINA",
      reason: "Agrupación de núcleo húmedo (plomería)",
      strength: "soft",
    });
  }

  if (has("LAVADERO") && has("COCINA")) {
    edges.push({
      from: "LAVADERO",
      to: "COCINA",
      reason: "Lavadero junto a cocina",
      strength: "soft",
    });
  }
  if (has("LAVADERO") && has("BANIO")) {
    edges.push({
      from: "LAVADERO",
      to: "BANIO",
      reason: "Lavadero junto a baño",
      strength: "soft",
    });
  }

  if (has("GALERIA") && has("SALA_COMEDOR")) {
    edges.push({
      from: "GALERIA",
      to: "SALA_COMEDOR",
      reason: "Galería como transición cubierta hacia el living",
      strength: "soft",
    });
  }
  if (has("GALERIA") && has("PATIO")) {
    edges.push({
      from: "GALERIA",
      to: "PATIO",
      reason: "Galería abre al patio",
      strength: "soft",
    });
  }

  return edges;
}

export function validateTopologyGraph(
  graph: TopologyGraph,
  program: ArchitecturalProgram,
): TopologyGraphValidation {
  const errors: string[] = [];
  const warnings: string[] = [...graph.warnings];

  const nodeIds = new Set(graph.nodes.map((n) => n.roomId));
  const topologyNodeIds = new Set(graph.nodes.map((n) => n.id));

  if (graph.nodes.length !== topologyNodeIds.size) {
    errors.push("Duplicate topology node ids detected.");
  }

  const roomIdCounts = new Map<string, number>();
  for (const n of graph.nodes) {
    roomIdCounts.set(n.roomId, (roomIdCounts.get(n.roomId) ?? 0) + 1);
  }
  for (const [id, count] of roomIdCounts) {
    if (count > 1) errors.push(`Duplicate roomId in graph: ${id}`);
  }

  const hardEdgeKeys = new Set<string>();
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(`Edge references missing node: ${edge.from} → ${edge.to}`);
    }
    if (edge.from === edge.to) {
      warnings.push(`Self-loop edge: ${edge.from}`);
    }
    if (edge.strength === "soft") {
      if (
        edge.desiredConnection === "door" ||
        edge.desiredConnection === "open_passage"
      ) {
        warnings.push(
          `Soft adjacency ${edge.from} ↔ ${edge.to} inferred as "${edge.desiredConnection}" — consider promoting to hard if geometry should follow.`,
        );
      }
    }

    if (edge.strength === "hard") {
      const key = [edge.from, edge.to].sort().join("::");
      if (hardEdgeKeys.has(key)) {
        errors.push(`Duplicate hard edge: ${edge.from} ↔ ${edge.to}`);
      }
      hardEdgeKeys.add(key);
      if (edge.desiredConnection === "near") {
        warnings.push(
          `Hard edge ${edge.from} ↔ ${edge.to} uses "near" — geometry may be weak; review inference.`,
        );
      }
    }
  }

  const socialIds = new Set(
    graph.nodes
      .filter((n) => n.type === "social" || n.clusterId === "social_cluster")
      .map((n) => n.roomId),
  );
  for (const outdoorNode of graph.nodes.filter((n) => n.type === "outdoor")) {
    const hardToSocial = graph.edges.some(
      (e) =>
        e.strength === "hard" &&
        ((e.from === outdoorNode.roomId && socialIds.has(e.to)) ||
          (e.to === outdoorNode.roomId && socialIds.has(e.from))),
    );
    if (hardToSocial && outdoorNode.priority !== "high") {
      warnings.push(
        `Outdoor room ${outdoorNode.roomId} has hard link to social but priority is "${outdoorNode.priority}" (expected high).`,
      );
    }
  }

  const mentionsLShape = program.styleKeywords.some((k) =>
    /en l|l-shape|l shape/i.test(k),
  );
  if (
    mentionsLShape &&
    (!program.desiredPlanShape || program.desiredPlanShape === "unknown")
  ) {
    warnings.push(
      'styleKeywords mention an L-shaped plan but desiredPlanShape is missing or "unknown".',
    );
  }

  const clusterRoomIds = new Set(
    graph.clusters.flatMap((c) => c.roomIds),
  );
  for (const node of graph.nodes) {
    if (!clusterRoomIds.has(node.roomId)) {
      errors.push(`Required room ${node.roomId} is not assigned to any cluster.`);
    }
    if (node.required && !graph.clusters.some((c) => c.roomIds.includes(node.roomId))) {
      errors.push(`Required room missing from clusters: ${node.roomId}`);
    }
  }

  const socialNodes = graph.nodes.filter(
    (n) => n.type === "social" || n.clusterId === "social_cluster",
  );
  if (socialNodes.length === 0) {
    warnings.push("No social node in topology graph.");
  }

  const privateCluster = graph.clusters.find(
    (c) => c.type === "private_cluster" || c.id === "private_cluster",
  );
  const privateNodes = graph.nodes.filter((n) => n.type === "private");
  if (privateNodes.length > 0 && !privateCluster) {
    warnings.push("Bedrooms exist but no private_cluster was formed.");
  }

  const outdoorNodes = graph.nodes.filter((n) => n.type === "outdoor");
  if (outdoorNodes.length > 0) {
    const outdoorId = outdoorNodes[0]!.roomId;
    const socialOrServiceIds = new Set(
      graph.nodes
        .filter((n) => n.type === "social" || n.type === "service")
        .map((n) => n.roomId),
    );
    const connected = graph.edges.some(
      (e) =>
        (e.from === outdoorId && socialOrServiceIds.has(e.to)) ||
        (e.to === outdoorId && socialOrServiceIds.has(e.from)),
    );
    if (!connected) {
      warnings.push(
        "Outdoor space exists but no edge connects it to social or service areas.",
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
