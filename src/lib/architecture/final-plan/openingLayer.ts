import { ARCH } from "./architecturalPalette";
import type { PlanOpening, PlanWindow, WallSide } from "./types";

const WALL_ERASE = ARCH.fillRoom;
const DOOR_LEAF = ARCH.doorLeaf;
const PASSAGE = ARCH.inkMuted;
const WINDOW_FRAME = ARCH.window;
const WINDOW_GLASS = ARCH.windowGlass;
const SLIDING_TRACK = ARCH.inkMuted;

function wallGap(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): string {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${WALL_ERASE}" stroke-width="${width}" stroke-linecap="butt"/>`;
}

function trackOffset(wall: WallSide, amount: number): { dx: number; dy: number } {
  switch (wall) {
    case "top":
      return { dx: 0, dy: amount };
    case "bottom":
      return { dx: 0, dy: -amount };
    case "left":
      return { dx: amount, dy: 0 };
    case "right":
      return { dx: -amount, dy: 0 };
  }
}

function renderHingedDoor(op: PlanOpening): string {
  const gapW = Math.max(1.45, Math.hypot(op.x2 - op.x1, op.y2 - op.y1) * 0.22);
  return (
    `<g class="door-hinged">` +
    wallGap(op.x1, op.y1, op.x2, op.y2, gapW) +
    `<line x1="${op.hingeX}" y1="${op.hingeY}" x2="${op.leafX}" y2="${op.leafY}" stroke="${DOOR_LEAF}" stroke-width="0.28" stroke-linecap="square"/>` +
    (op.swingArcD
      ? `<path d="${op.swingArcD}" fill="none" stroke="${DOOR_LEAF}" stroke-width="0.18" stroke-dasharray="0.35 0.3" stroke-linecap="round" opacity="0.75"/>`
      : "") +
    `</g>`
  );
}

function renderPassage(op: PlanOpening): string {
  const len = Math.hypot(op.x2 - op.x1, op.y2 - op.y1) || 1;
  const gapW = Math.max(1.55, len * 0.28);
  const jamb = 0.42;
  const dx = op.x2 - op.x1;
  const dy = op.y2 - op.y1;
  const nx = (-dy / len) * jamb;
  const ny = (dx / len) * jamb;

  return (
    `<g class="door-passage">` +
    wallGap(op.x1, op.y1, op.x2, op.y2, gapW) +
    `<line x1="${op.x1 + nx}" y1="${op.y1 + ny}" x2="${op.x2 + nx}" y2="${op.y2 + ny}" stroke="${PASSAGE}" stroke-width="0.2" stroke-linecap="square"/>` +
    `<line x1="${op.x1 - nx * 0.35}" y1="${op.y1 - ny * 0.35}" x2="${op.x1 + nx * 0.35}" y2="${op.y1 + ny * 0.35}" stroke="${PASSAGE}" stroke-width="0.24" stroke-linecap="square"/>` +
    `<line x1="${op.x2 - nx * 0.35}" y1="${op.y2 - ny * 0.35}" x2="${op.x2 + nx * 0.35}" y2="${op.y2 + ny * 0.35}" stroke="${PASSAGE}" stroke-width="0.24" stroke-linecap="square"/>` +
    `</g>`
  );
}

function renderSlidingDoor(op: PlanOpening, wide: boolean): string {
  const len = Math.hypot(op.x2 - op.x1, op.y2 - op.y1) || 1;
  const gapW = wide ? Math.max(1.65, len * 0.3) : Math.max(1.45, len * 0.24);
  const off = wide ? 0.34 : 0.24;
  const { dx, dy } = trackOffset(op.wall, off);
  const panelInset = wide ? 0.5 : 0.38;
  const px1 = op.x1 + dx * (panelInset / off);
  const py1 = op.y1 + dy * (panelInset / off);
  const px2 = op.x2 + dx * (panelInset / off);
  const py2 = op.y2 + dy * (panelInset / off);

  return (
    `<g class="${wide ? "door-wide-sliding" : "door-sliding"}">` +
    wallGap(op.x1, op.y1, op.x2, op.y2, gapW) +
    `<line x1="${op.x1 + dx}" y1="${op.y1 + dy}" x2="${op.x2 + dx}" y2="${op.y2 + dy}" stroke="${SLIDING_TRACK}" stroke-width="0.16" stroke-linecap="square" opacity="0.8"/>` +
    `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="${DOOR_LEAF}" stroke-width="0.24" stroke-linecap="square"/>` +
    `<line x1="${px1}" y1="${py1}" x2="${px2}" y2="${py2}" stroke="${DOOR_LEAF}" stroke-width="0.16" stroke-linecap="square" opacity="0.7"/>` +
    `</g>`
  );
}

export function renderOpenings(openings: PlanOpening[]): string {
  return openings
    .map((op) => {
      switch (op.kind) {
        case "passage":
          return renderPassage(op);
        case "wide_sliding":
          return renderSlidingDoor(op, true);
        case "sliding":
          return renderSlidingDoor(op, false);
        case "hinged":
        default:
          return renderHingedDoor(op);
      }
    })
    .join("");
}

export function renderWindows(windows: PlanWindow[]): string {
  return windows
    .map((w) => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1;
      const eraseW = Math.max(1.2, len * 0.22);
      return (
        `<g class="window-opening" pointer-events="none">` +
        wallGap(w.x1, w.y1, w.x2, w.y2, eraseW) +
        `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="${WINDOW_FRAME}" stroke-width="0.3" stroke-linecap="square"/>` +
        `<line x1="${w.ix1}" y1="${w.iy1}" x2="${w.ix2}" y2="${w.iy2}" stroke="${WINDOW_GLASS}" stroke-width="0.16" stroke-linecap="square" opacity="0.9"/>` +
        `</g>`
      );
    })
    .join("");
}
