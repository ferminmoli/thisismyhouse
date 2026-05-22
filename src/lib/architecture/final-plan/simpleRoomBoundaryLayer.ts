import type { PlanRoom } from "./types";

const FILLS = {
  social: "#FAF9F7",
  private: "#F7F5F9",
  service: "#F8FAFC",
  circulation: "#F5F5F4",
  work: "#F4F7F5",
  flex: "#FAFAF9",
  outdoor: "#EEF6EE",
  semi_outdoor: "#F8FAF8",
} as const;

/** Single stroke per zone — no wall graph. */
const BOUNDARY = {
  perimeter: { stroke: "#1E293B", width: 0.62 },
  interior: { stroke: "#64748B", width: 0.36 },
  outdoor: { stroke: "#94A3B8", width: 0.38, dash: ' stroke-dasharray="2.2 1.3"' },
  semi: { stroke: "#94A3B8", width: 0.34, dash: ' stroke-dasharray="1.5 0.95"' },
} as const;

export type SimpleRoomBoundaryOptions = {
  /** When wall graph debug is on, omit strokes to avoid double boundaries. */
  includeStroke?: boolean;
};

function wetPattern(room: PlanRoom): string | null {
  switch (room.wetKind) {
    case "bathroom":
      return "arch-pat-bath";
    case "kitchen":
      return "arch-pat-kitchen";
    case "laundry":
      return "arch-pat-laundry";
    default:
      return null;
  }
}

function roomFill(room: PlanRoom): { fill: string; pattern: string | null } {
  if (room.enclosure === "outdoor") {
    return { fill: FILLS.outdoor, pattern: "arch-pat-outdoor" };
  }
  if (room.enclosure === "semi_covered") {
    return { fill: FILLS.semi_outdoor, pattern: null };
  }
  const key = room.zoneType as keyof typeof FILLS;
  const fill =
    key === "social" ||
    key === "private" ||
    key === "service" ||
    key === "circulation" ||
    key === "work"
      ? FILLS[key]
      : FILLS.flex;
  return { fill, pattern: wetPattern(room) };
}

function roomStroke(room: PlanRoom, includeStroke: boolean) {
  if (!includeStroke) {
    return { stroke: "none", strokeWidth: 0, dash: "" };
  }
  const role = room.boundaryRole;
  if (role === "outdoor") {
    const b = BOUNDARY.outdoor;
    return { stroke: b.stroke, strokeWidth: b.width, dash: b.dash };
  }
  if (role === "semi") {
    const b = BOUNDARY.semi;
    return { stroke: b.stroke, strokeWidth: b.width, dash: b.dash };
  }
  if (role === "perimeter") {
    const b = BOUNDARY.perimeter;
    return { stroke: b.stroke, strokeWidth: b.width, dash: "" };
  }
  const b = BOUNDARY.interior;
  return { stroke: b.stroke, strokeWidth: b.width, dash: "" };
}

/** Public SimpleRoomBoundaryLayer — fill + one boundary stroke per zone. */
export function renderSimpleRoomBoundaries(
  rooms: PlanRoom[],
  options: SimpleRoomBoundaryOptions = {},
): string {
  const includeStroke = options.includeStroke !== false;
  const sorted = [...rooms].sort((a, b) => {
    const order = { covered: 0, semi_covered: 1, outdoor: 2 };
    return order[a.enclosure] - order[b.enclosure];
  });

  return sorted
    .map((room) => {
      const { fill, pattern } = roomFill(room);
      const { stroke, strokeWidth, dash } = roomStroke(room, includeStroke);
      const fillAttr = pattern ? ` fill="url(#${pattern})"` : ` fill="${fill}"`;
      return (
        `<rect x="${room.x}" y="${room.y}" width="${room.width}" height="${room.height}"` +
        `${fillAttr} stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`
      );
    })
    .join("");
}
