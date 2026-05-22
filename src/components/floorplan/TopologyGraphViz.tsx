"use client";

import type { TopologyGraph } from "@/lib/architecture/topologyGraph";

const CLUSTER_COLORS: Record<string, string> = {
  access_cluster: "#e7e5e4",
  social_cluster: "#fef3c7",
  private_cluster: "#dbeafe",
  service_cluster: "#fce7f3",
  outdoor_cluster: "#d1fae5",
  circulation_cluster: "#f3e8ff",
  mixed_cluster: "#f5f5f4",
};

type Props = {
  graph: TopologyGraph;
};

type NodePos = { roomId: string; x: number; y: number };

export function TopologyGraphViz({ graph }: Props) {
  const padding = 12;
  const clusterGap = 10;
  const nodeH = 22;
  const clusterHeader = 18;
  const colW = 118;

  const clusters = graph.clusters;
  const cols = Math.min(3, Math.max(1, clusters.length));
  const rows = Math.ceil(clusters.length / cols);

  const clusterLayouts: {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    positions: NodePos[];
  }[] = [];

  let maxH = 0;
  clusters.forEach((cluster, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const nodeCount = cluster.roomIds.length;
    const h = clusterHeader + nodeCount * nodeH + padding;
    const x = col * (colW + clusterGap);
    const y = row * (maxH + clusterGap);
    const positions: NodePos[] = cluster.roomIds.map((roomId, ni) => ({
      roomId,
      x: x + colW / 2,
      y: y + clusterHeader + padding / 2 + ni * nodeH + nodeH / 2,
    }));
    clusterLayouts.push({ id: cluster.id, x, y, w: colW, h, positions });
    maxH = Math.max(maxH, h);
  });

  const svgW = cols * (colW + clusterGap) + padding;
  const svgH = rows * (maxH + clusterGap) + padding;
  const posByRoom = new Map<string, NodePos>();
  for (const layout of clusterLayouts) {
    for (const p of layout.positions) posByRoom.set(p.roomId, p);
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-stone-50 p-2 ring-1 ring-stone-200">
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="text-[9px]"
        role="img"
        aria-label="Visualización abstracta del grafo topológico"
      >
        {graph.edges.map((edge) => {
          const from = posByRoom.get(edge.from);
          const to = posByRoom.get(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={edge.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edge.strength === "hard" ? "#0f766e" : "#94a3b8"}
              strokeWidth={edge.strength === "hard" ? 2 : 1}
              strokeDasharray={edge.strength === "soft" ? "4 3" : undefined}
              opacity={0.85}
            />
          );
        })}

        {clusterLayouts.map((layout) => {
          const cluster = graph.clusters.find((c) => c.id === layout.id);
          const fill =
            CLUSTER_COLORS[layout.id] ?? CLUSTER_COLORS.mixed_cluster;
          return (
            <g key={layout.id}>
              <rect
                x={layout.x}
                y={layout.y}
                width={layout.w}
                height={layout.h}
                rx={6}
                fill={fill}
                stroke="#d6d3d1"
                strokeWidth={1}
              />
              <text
                x={layout.x + 6}
                y={layout.y + 12}
                fill="#44403c"
                fontSize={9}
                fontWeight={600}
              >
                {cluster?.label ?? layout.id}
              </text>
              {layout.positions.map((p) => {
                const node = graph.nodes.find((n) => n.roomId === p.roomId);
                const short =
                  p.roomId.length > 12
                    ? p.roomId.slice(0, 10) + "…"
                    : p.roomId;
                return (
                  <g key={p.roomId}>
                    <rect
                      x={p.x - 44}
                      y={p.y - 8}
                      width={88}
                      height={16}
                      rx={8}
                      fill="white"
                      stroke="#a8a29e"
                      strokeWidth={0.75}
                    />
                    <text
                      x={p.x}
                      y={p.y + 3}
                      textAnchor="middle"
                      fill="#292524"
                      fontSize={7}
                    >
                      {short}
                    </text>
                    {node?.required && (
                      <circle
                        cx={p.x + 40}
                        cy={p.y}
                        r={2}
                        fill="#0d9488"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[10px] text-stone-500">
        Línea sólida = hard · punteada = soft · puntos teal = required
      </p>
    </div>
  );
}
