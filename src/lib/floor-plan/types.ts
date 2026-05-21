/** Tipos compartidos del renderer unificado (muros / aberturas). */

export type WallSide = "top" | "bottom" | "left" | "right";

export type WallOpening = {
  centerX: number;
  centerY: number;
  span: number;
  wall: WallSide;
  along: "h" | "v";
};

export const REQUIRED_DISCLAIMER =
  "Es un boceto conceptual para conversar. Un arquitecto debe validar y diseñar el proyecto real.";
