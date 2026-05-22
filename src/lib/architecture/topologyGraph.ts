import type { RoomType } from "./architecturalProgram";

export type DesiredConnection =
  | "shared_wall"
  | "door"
  | "open_passage"
  | "visual"
  | "near";

export type TopologyNode = {
  id: string;
  roomId: string;
  label: string;
  type: RoomType;
  required: boolean;
  priority: "low" | "medium" | "high";
  clusterId: string;
};

export type TopologyEdge = {
  id: string;
  from: string;
  to: string;
  strength: "hard" | "soft";
  reason: string;
  desiredConnection: DesiredConnection;
  weight: number;
};

export type TopologyClusterType =
  | "social_cluster"
  | "private_cluster"
  | "service_cluster"
  | "outdoor_cluster"
  | "access_cluster"
  | "circulation_cluster"
  | "mixed_cluster";

export type TopologyCluster = {
  id: string;
  label: string;
  type: TopologyClusterType;
  roomIds: string[];
  priority: "low" | "medium" | "high";
  notes: string[];
};

export type TopologyGraph = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  clusters: TopologyCluster[];
  warnings: string[];
};

export type TopologyGraphValidation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};
