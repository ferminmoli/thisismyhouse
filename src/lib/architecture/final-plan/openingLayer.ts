import type { PlanOpening, PlanWindow, WallSide } from "./types";

const WALL_ERASE = "#FFFFFF";
const DOOR = "#1E293B";
const PASSAGE = "#64748B";
const WINDOW_FRAME = "#5B7C9A";
const WINDOW_GLASS = "#94A3B8";
const SLIDING_TRACK = "#475569";

function wallGap(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width = 1.28,
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
  return (
    `<g class="door-hinged">` +
    wallGap(op.x1, op.y1, op.x2, op.y2) +
    `<line x1="${op.hingeX}" y1="${op.hingeY}" x2="${op.leafX}" y2="${op.leafY}" stroke="${DOOR}" stroke-width="0.34" stroke-linecap="square"/>` +
    (op.swingArcD
      ? `<path d="${op.swingArcD}" fill="none" stroke="${DOOR}" stroke-width="0.24" stroke-linecap="round"/>`
      : "") +
    `</g>`
  );
}

function renderPassage(op: PlanOpening): string {
  const jamb = 0.35;
  const dx = op.x2 - op.x1;
  const dy = op.y2 - op.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * jamb;
  const ny = (dx / len) * jamb;

  return (
    `<g class="door-passage">` +
    wallGap(op.x1, op.y1, op.x2, op.y2, 1.35) +
    `<line x1="${op.x1 + nx}" y1="${op.y1 + ny}" x2="${op.x2 + nx}" y2="${op.y2 + ny}" stroke="${PASSAGE}" stroke-width="0.22" stroke-linecap="square"/>` +
    `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="${PASSAGE}" stroke-width="0.26" stroke-dasharray="0.55 0.5" stroke-linecap="square" stroke-opacity="0.85"/>` +
    `</g>`
  );
}

function renderSlidingDoor(op: PlanOpening, wide: boolean): string {
  const off = wide ? 0.38 : 0.26;
  const { dx, dy } = trackOffset(op.wall, off);
  const panelInset = wide ? 0.55 : 0.4;
  const px1 = op.x1 + dx * (panelInset / off);
  const py1 = op.y1 + dy * (panelInset / off);
  const px2 = op.x2 + dx * (panelInset / off);
  const py2 = op.y2 + dy * (panelInset / off);
  const panelW = wide ? 0.28 : 0.22;

  return (
    `<g class="${wide ? "door-wide-sliding" : "door-sliding"}">` +
    wallGap(op.x1, op.y1, op.x2, op.y2, wide ? 1.42 : 1.28) +
    `<line x1="${op.x1 + dx}" y1="${op.y1 + dy}" x2="${op.x2 + dx}" y2="${op.y2 + dy}" stroke="${SLIDING_TRACK}" stroke-width="0.2" stroke-linecap="square"/>` +
    `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="${DOOR}" stroke-width="${panelW}" stroke-linecap="square"/>` +
    `<line x1="${px1}" y1="${py1}" x2="${px2}" y2="${py2}" stroke="${DOOR}" stroke-width="${panelW * 0.65}" stroke-linecap="square" stroke-opacity="0.75"/>` +
    `</g>`
  );
}

/** Door overlays on zone boundaries — no wall graph segments. */
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
      const eraseW = Math.max(1.05, len * 0.18);
      return (
        `<g class="window-opening" pointer-events="none">` +
        wallGap(w.x1, w.y1, w.x2, w.y2, eraseW) +
        `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="${WINDOW_FRAME}" stroke-width="0.36" stroke-linecap="square"/>` +
        `<line x1="${w.ix1}" y1="${w.iy1}" x2="${w.ix2}" y2="${w.iy2}" stroke="${WINDOW_GLASS}" stroke-width="0.22" stroke-linecap="square"/>` +
        `</g>`
      );
    })
    .join("");
}
