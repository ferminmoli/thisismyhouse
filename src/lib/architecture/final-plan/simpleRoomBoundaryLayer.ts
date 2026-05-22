import { ARCH } from "./architecturalPalette";
import type { PlanRoom } from "./types";

const BOUNDARY = {
  perimeter: { stroke: ARCH.wallExterior, width: ARCH.wallExteriorWidth },
  interior: { stroke: ARCH.wallInterior, width: ARCH.wallInteriorWidth },
  outdoor: {
    stroke: ARCH.wallOutdoor,
    width: ARCH.wallOutdoorWidth,
    dash: ' stroke-dasharray="2.8 1.4"',
  },
  semi: {
    stroke: ARCH.wallOutdoor,
    width: ARCH.wallOutdoorWidth * 0.9,
    dash: ' stroke-dasharray="2 1.2"',
  },
} as const;

export type SimpleRoomBoundaryOptions = {
  includeStroke?: boolean;
};

function wetPattern(room: PlanRoom): string | null {
  if (room.wetKind === "bathroom") return "arch-pat-bath";
  if (room.wetKind === "laundry") return "arch-pat-laundry";
  return null;
}

function roomFill(room: PlanRoom): { fill: string; pattern: string | null } {
  if (room.enclosure === "outdoor") {
    return { fill: ARCH.fillOutdoor, pattern: "arch-pat-outdoor" };
  }
  if (room.enclosure === "semi_covered") {
    return { fill: ARCH.fillSemi, pattern: "arch-pat-outdoor" };
  }
  const pattern = wetPattern(room);
  return { fill: ARCH.fillRoom, pattern };
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

/** Fills (opaque) then strokes — clean interiors, clear wall hierarchy. */
export function renderSimpleRoomBoundaries(
  rooms: PlanRoom[],
  options: SimpleRoomBoundaryOptions = {},
): string {
  const includeStroke = options.includeStroke !== false;
  const sorted = [...rooms].sort((a, b) => {
    const order = { covered: 0, semi_covered: 1, outdoor: 2 };
    return order[a.enclosure] - order[b.enclosure];
  });

  const fills = sorted
    .map((room) => {
      const { fill, pattern } = roomFill(room);
      const fillAttr = pattern ? ` fill="url(#${pattern})"` : ` fill="${fill}"`;
      return (
        `<rect x="${room.x}" y="${room.y}" width="${room.width}" height="${room.height}"` +
        `${fillAttr} stroke="none"/>`
      );
    })
    .join("");

  if (!includeStroke) return fills;

  const strokes = sorted
    .map((room) => {
      const { stroke, strokeWidth, dash } = roomStroke(room, true);
      return (
        `<rect x="${room.x}" y="${room.y}" width="${room.width}" height="${room.height}"` +
        ` fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"` +
        ` stroke-linecap="square" stroke-linejoin="miter"${dash}/>`
      );
    })
    .join("");

  return fills + strokes;
}
