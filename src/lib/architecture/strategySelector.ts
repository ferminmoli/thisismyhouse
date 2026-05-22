import type { ArchitecturalProgram } from "./architecturalProgram";
import type { TopologyGraph } from "./topologyGraph";

export type PartiType =
  | "l_shape_patio"
  | "compact_linear"
  | "central_courtyard"
  | "narrow_lot"
  | "two_wing_family"
  | "weekend_gallery";

export type ArchitecturalStrategy = {
  preferredParti: PartiType;
  partiCandidates: PartiType[];
  reasons: string[];
  constraints: {
    bedroomsCount: number;
    bathroomsCount: number;
    needsPatio: boolean;
    needsPrivateWing: boolean;
    needsIntegratedKitchen: boolean;
    targetAreaM2?: number;
  };
};

const HIGH_WEIGHT_SOCIAL_OUTDOOR = 80;

function textBlob(program: ArchitecturalProgram): string {
  return [
    program.inputSummary,
    ...program.priorities,
    ...program.lifestyle,
    ...program.styleKeywords,
  ]
    .join(" ")
    .toLowerCase();
}

function countPrivateNodes(graph: TopologyGraph): number {
  return graph.nodes.filter((n) => n.type === "private").length;
}

function socialOutdoorEdges(graph: TopologyGraph) {
  const socialIds = new Set(
    graph.nodes
      .filter((n) => n.type === "social" || n.clusterId === "social_cluster")
      .map((n) => n.roomId),
  );
  const outdoorIds = new Set(
    graph.nodes.filter((n) => n.type === "outdoor").map((n) => n.roomId),
  );
  return graph.edges.filter(
    (e) =>
      (socialIds.has(e.from) && outdoorIds.has(e.to)) ||
      (socialIds.has(e.to) && outdoorIds.has(e.from)),
  );
}

function hasStrongSocialOutdoorLink(graph: TopologyGraph): boolean {
  return socialOutdoorEdges(graph).some(
    (e) => e.strength === "hard" || e.weight >= HIGH_WEIGHT_SOCIAL_OUTDOOR,
  );
}

function strongestSocialOutdoorEdge(graph: TopologyGraph) {
  return socialOutdoorEdges(graph).sort((a, b) => b.weight - a.weight)[0];
}

function hasKitchenSocialHardOpen(graph: TopologyGraph): boolean {
  return graph.edges.some(
    (e) =>
      e.strength === "hard" &&
      e.desiredConnection === "open_passage" &&
      ((/SALA|LIVING|COMEDOR|ESTAR/i.test(e.from) && /COCINA/i.test(e.to)) ||
        (/SALA|LIVING|COMEDOR|ESTAR/i.test(e.to) && /COCINA/i.test(e.from))),
  );
}

function privateClusterBedroomCount(graph: TopologyGraph): number {
  const cluster = graph.clusters.find((c) => c.id === "private_cluster");
  if (!cluster) return countPrivateNodes(graph);
  return cluster.roomIds.filter((id) => /DORMITORIO|BEDROOM/i.test(id)).length;
}

function prefersLShapePatio(
  program: ArchitecturalProgram,
  graph: TopologyGraph,
): boolean {
  const wantsL = program.desiredPlanShape === "l_shape";
  const hasPatio = graph.nodes.some((n) => n.type === "outdoor");
  return wantsL && hasPatio && hasStrongSocialOutdoorLink(graph);
}

export function selectArchitecturalStrategy(
  program: ArchitecturalProgram,
  topologyGraph: TopologyGraph,
): ArchitecturalStrategy {
  const blob = textBlob(program);
  const bedrooms = countPrivateNodes(topologyGraph);
  const privateInCluster = privateClusterBedroomCount(topologyGraph);
  const bathrooms = program.rooms.filter(
    (r) => r.type === "service" && /ban|baño|wc/i.test(r.label),
  ).length;
  const needsPatio = topologyGraph.nodes.some((n) => n.type === "outdoor");
  const needsIntegratedKitchen = hasKitchenSocialHardOpen(topologyGraph);
  const needsPrivateWing = bedrooms >= 2;
  const lShapePatio = prefersLShapePatio(program, topologyGraph);
  const topOutdoorEdge = strongestSocialOutdoorEdge(topologyGraph);

  const candidates: PartiType[] = [];
  const reasons: string[] = [];

  if (topOutdoorEdge) {
    reasons.push(
      `El grafo topológico tiene una relación social–exterior (${topOutdoorEdge.from} ↔ ${topOutdoorEdge.to}, peso ${topOutdoorEdge.weight}, ${topOutdoorEdge.desiredConnection}).`,
    );
  }

  if (program.desiredPlanShape === "l_shape") {
    reasons.push(
      "desiredPlanShape = l_shape: la forma en L es intención de parti, no forma del lote.",
    );
  }

  if (privateInCluster >= 3 || bedrooms >= 3) {
    reasons.push(
      `El grafo contiene un cluster privado con ${Math.max(privateInCluster, bedrooms)} dormitorios.`,
    );
  }

  if (needsIntegratedKitchen) {
    reasons.push(
      "La cocina tiene una relación hard/open_passage con el área social.",
    );
  }

  const lotShape = program.site.lotShape;

  if (lShapePatio) {
    candidates.push("l_shape_patio");
    reasons.push(
      "Planta en L con patio: desiredPlanShape l_shape, patio presente y vínculo social–exterior fuerte en el grafo.",
    );
  } else if (bedrooms >= 3 && needsPatio && hasStrongSocialOutdoorLink(topologyGraph)) {
    candidates.push("l_shape_patio");
    reasons.push(
      "Tres dormitorios, patio y relación social–exterior fuerte sugieren planta en L.",
    );
  }

  if (lotShape === "narrow" || blob.includes("angost") || blob.includes("estrech")) {
    if (!candidates.includes("narrow_lot")) candidates.push("narrow_lot");
    reasons.push("El lote es angosto (site.lotShape), no la forma deseada del plano.");
  }

  if (
    program.desiredPlanShape === "central_patio" ||
    blob.includes("patio central") ||
    blob.includes("patio interior") ||
    program.priorities.some((p) => p.toLowerCase().includes("patio central"))
  ) {
    if (!candidates.includes("central_courtyard")) {
      candidates.push("central_courtyard");
    }
    reasons.push("Las prioridades o desiredPlanShape apuntan a patio central.");
  }

  if (
    blob.includes("fin de semana") ||
    blob.includes("galer") ||
    blob.includes("parrill") ||
    blob.includes("weekend")
  ) {
    if (!candidates.includes("weekend_gallery")) {
      candidates.push("weekend_gallery");
    }
    reasons.push("El estilo de vida apunta a galería, parrilla o casa de fin de semana.");
  }

  if (needsPrivateWing && !candidates.includes("two_wing_family")) {
    candidates.push("two_wing_family");
    reasons.push(
      "El cluster privado y la circulación sugieren un ala íntima separada del núcleo social.",
    );
  }

  if (!candidates.includes("compact_linear")) {
    candidates.push("compact_linear");
    reasons.push("Alternativa lineal compacta como respaldo eficiente en el grafo.");
  }

  const preferredParti: PartiType = lShapePatio
    ? "l_shape_patio"
    : lotShape === "narrow"
      ? "narrow_lot"
      : candidates[0] ?? "compact_linear";

  const partiCandidates = [
    preferredParti,
    ...candidates.filter((c) => c !== preferredParti),
  ].slice(0, 3);

  if (preferredParti === "l_shape_patio" && !reasons.some((r) => r.includes("desiredPlanShape"))) {
    reasons.push(
      "Casa con patio: la topología social–exterior encaja con planta en L.",
    );
  }

  return {
    preferredParti,
    partiCandidates,
    reasons,
    constraints: {
      bedroomsCount: bedrooms,
      bathroomsCount: Math.max(bathrooms, 1),
      needsPatio,
      needsPrivateWing,
      needsIntegratedKitchen,
      targetAreaM2: program.targetAreaM2,
    },
  };
}
