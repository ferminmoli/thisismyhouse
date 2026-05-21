import { findSharedWall } from "./shared-walls";
import type {
  AutoDoorPlacement,
  ConstraintAdjacency,
  PlacedZone,
} from "./types";

function defaultDoorWidth(segLength: number): number {
  return Math.max(6, Math.min(14, segLength * 0.22));
}

/**
 * Place doors on shared-wall segments implied by adjacencies.
 */
export function generateDoorsFromAdjacencies(
  zones: PlacedZone[],
  adjacencies: ConstraintAdjacency[],
): AutoDoorPlacement[] {
  const byId = new Map(zones.map((z) => [z.id, z]));
  const doors: AutoDoorPlacement[] = [];
  let idx = 1;

  for (const adj of adjacencies) {
    const a = byId.get(adj.from);
    const b = byId.get(adj.to);
    if (!a || !b) continue;

    const wall = findSharedWall(a, b) ?? findSharedWall(b, a);
    if (!wall || wall.length < 4) continue;

    const doorW = defaultDoorWidth(wall.length);
    const isPassage =
      adj.type === "door_connection" &&
      (a.type === "flex" || b.type === "flex");

    doors.push({
      id: `AUTO_D${String(idx++).padStart(2, "0")}`,
      from: wall.from,
      to: wall.to,
      wall: wall.wallFrom,
      position: 50,
      width: Math.min(18, (doorW / wall.length) * 100),
      type: isPassage ? "open_passage" : "door",
    });
  }

  return doors;
}
