import type { GeneratedPlan } from "../generatedPlan";
import type { PlanFurniture, PlanRoom } from "./types";

const MIN_DIM = 5.5;

function roomFits(room: PlanRoom): boolean {
  return Math.min(room.width, room.height) >= MIN_DIM;
}

function place(
  room: PlanRoom,
  type: string,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  rotation?: number,
): PlanFurniture | null {
  if (!roomFits(room)) return null;
  const w = room.width * fw;
  const h = room.height * fh;
  if (w < 0.8 || h < 0.8) return null;
  if (Math.min(w, h) > Math.min(room.width, room.height) * 0.52) return null;
  return {
    type,
    x: room.x + room.width * fx,
    y: room.y + room.height * fy,
    width: w,
    height: h,
    rotation,
  };
}

function overlaps(a: PlanFurniture, b: PlanFurniture): boolean {
  const pad = 0.35;
  return !(
    a.x + a.width + pad < b.x ||
    a.x - pad > b.x + b.width ||
    a.y + a.height + pad < b.y ||
    a.y - pad > b.y + b.height
  );
}

function hostRoom(f: PlanFurniture, rooms: PlanRoom[]): PlanRoom | undefined {
  const cx = f.x + f.width / 2;
  const cy = f.y + f.height / 2;
  return rooms.find(
    (r) =>
      cx >= r.x && cx <= r.x + r.width && cy >= r.y && cy <= r.y + r.height,
  );
}

function countInRoom(room: PlanRoom, rooms: PlanRoom[], items: PlanFurniture[]): number {
  return items.filter((f) => hostRoom(f, rooms)?.id === room.id).length;
}

function fallbackPieces(room: PlanRoom): PlanFurniture[] {
  const pieces: PlanFurniture[] = [];

  if (room.enclosure === "outdoor") {
    const grill = place(room, "grill", 0.62, 0.55, 0.2, 0.2);
    const plant = place(room, "plant", 0.18, 0.22, 0.12, 0.12);
    const table = place(room, "outdoor_table", 0.35, 0.35, 0.28, 0.22);
    if (grill) pieces.push(grill);
    if (plant) pieces.push(plant);
    if (table && room.width >= 12) pieces.push(table);
    return pieces;
  }

  if (room.wetKind === "bathroom") {
    const toilet = place(room, "toilet", 0.12, 0.58, 0.2, 0.22);
    const sink = place(room, "sink", 0.55, 0.14, 0.18, 0.16);
    const shower = place(room, "shower", 0.68, 0.52, 0.24, 0.28);
    if (toilet) pieces.push(toilet);
    if (sink) pieces.push(sink);
    if (shower) pieces.push(shower);
    return pieces;
  }

  if (room.wetKind === "kitchen") {
    const counter = place(room, "kitchen_counter", 0.06, 0.08, 0.78, 0.28);
    const sink = place(room, "sink", 0.42, 0.12, 0.12, 0.1);
    const cooktop = place(room, "cooktop", 0.58, 0.12, 0.14, 0.1);
    const fridge = place(room, "fridge", 0.82, 0.1, 0.14, 0.35);
    if (counter) pieces.push(counter);
    if (sink) pieces.push(sink);
    if (cooktop) pieces.push(cooktop);
    if (fridge) pieces.push(fridge);
    return pieces;
  }

  if (room.wetKind === "laundry") {
    const washer = place(room, "washing_machine", 0.2, 0.25, 0.35, 0.4);
    if (washer) pieces.push(washer);
    return pieces;
  }

  if (room.zoneType === "private") {
    const double = room.width >= 10 && room.height >= 9;
    const bed = place(
      room,
      double ? "bed_double" : "bed_single",
      0.18,
      0.22,
      double ? 0.52 : 0.42,
      double ? 0.48 : 0.5,
    );
    const wardrobe = place(room, "wardrobe", 0.72, 0.15, 0.2, 0.55);
    if (bed) pieces.push(bed);
    if (wardrobe) pieces.push(wardrobe);
    return pieces;
  }

  if (room.zoneType === "social") {
    const sofa = place(room, "sofa", 0.08, 0.58, 0.42, 0.22);
    const table = place(room, "dining_table", 0.52, 0.2, 0.34, 0.32);
    const coffee = place(room, "coffee_table", 0.28, 0.38, 0.2, 0.16);
    if (sofa) pieces.push(sofa);
    if (table) pieces.push(table);
    if (coffee) pieces.push(coffee);
    return pieces;
  }

  return pieces;
}

/** Plan hints first; sparse rooms get architectural fallback symbols. */
export function buildFurnitureWithFallback(
  plan: GeneratedPlan,
  rooms: PlanRoom[],
  show: boolean,
): PlanFurniture[] {
  if (!show) return [];

  const fromPlan: PlanFurniture[] = (plan.furniture ?? []).map((f) => ({
    type: f.type,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    rotation: f.rotation,
  }));

  const merged = [...fromPlan];

  for (const room of rooms) {
    if (!roomFits(room)) continue;
    const existing = countInRoom(room, rooms, merged);
    if (existing >= 2) continue;

    for (const piece of fallbackPieces(room)) {
      if (merged.some((m) => overlaps(m, piece))) continue;
      merged.push(piece);
    }
  }

  return merged;
}
