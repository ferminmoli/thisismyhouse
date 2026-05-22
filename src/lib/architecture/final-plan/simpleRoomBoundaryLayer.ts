import { ARCH } from "./architecturalPalette";
import type { PlanRoom } from "./types";

/** Monochrome fills + one stroke per zone (public path — no wall graph). */
const FILLS = {
  covered: ARCH.fillCovered,
  outdoor: ARCH.fillOutdoor,
  semi_outdoor: ARCH.fillSemi,
} as const;

const BOUNDARY = {
  perimeter: { stroke: ARCH.wallExterior, width: ARCH.wallExteriorWidth },
  interior: { stroke: ARCH.wallInterior, width: ARCH.wallInteriorWidth },
  outdoor: { stroke: ARCH.inkSoft, width: 0.34, dash: ' stroke-dasharray="2.4 1.2"' },
  semi: { stroke: ARCH.inkSoft, width: 0.3, dash: ' stroke-dasharray="1.6 1"' },
} as const;

export type SimpleRoomBoundaryOptions = {
  /** When wall-graph debug is on, omit zone strokes to avoid doubling. */
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
    return { fill: FILLS.semi_outdoor, pattern: "arch-pat-outdoor" };
  }
  return { fill: FILLS.covered, pattern: wetPattern(room) };
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

/** Public SimpleRoomBoundaryLayer — fill + optional boundary stroke per zone. */
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
