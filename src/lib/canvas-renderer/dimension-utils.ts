/** Utilidades compartidas para cotas CAD en Canvas. */

export const DIM_LINE_COLOR = "#64748b";
export const DIM_TEXT_COLOR = "#334155";
export const DIM_MASK_FILL = "#fafaf9";
export const DIM_FONT =
  "600 10px 'Helvetica Neue', Helvetica, Arial, sans-serif";
export const DIM_EXTENSION_GAP = 6;

export const PRIMARY_DIM_OFFSET = 40;
export const TOTAL_DIM_EXTRA_OFFSET = 25;
export const DEFAULT_PX_PER_METER = 10;
export const DIM_TICK_LEN = 5;
export const ENVELOPE_EPS = 1.5;

export type PlanEnvelope = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

export function computePlanEnvelope(
  zones: Array<{ x: number; y: number; width: number; height: number }>,
): PlanEnvelope | null {
  if (zones.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const z of zones) {
    minX = Math.min(minX, z.x);
    minY = Math.min(minY, z.y);
    maxX = Math.max(maxX, z.x + z.width);
    maxY = Math.max(maxY, z.y + z.height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function pxToMeters(px: number, pxPerMeter: number): number {
  return px / pxPerMeter;
}

export function formatMetersLabel(px: number, pxPerMeter: number): string {
  const m = pxToMeters(px, pxPerMeter);
  return `${m.toFixed(2)} m`;
}

/** Tick arquitectónico a 45° en un extremo de la línea de cota. */
export function drawArchitecturalTick(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  horizontal: boolean,
): void {
  const d = DIM_TICK_LEN / Math.SQRT2;
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x - d, y - d);
    ctx.lineTo(x + d, y + d);
  } else {
    ctx.moveTo(x - d, y + d);
    ctx.lineTo(x + d, y - d);
  }
  ctx.stroke();
}

export function drawDimensionTextWithMask(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
    rotated?: boolean;
    maskFill?: string;
  } = {},
): void {
  const align = options.align ?? "center";
  const baseline = options.baseline ?? "bottom";
  const maskFill = options.maskFill ?? DIM_MASK_FILL;

  ctx.save();
  ctx.font = DIM_FONT;

  if (options.rotated) {
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    x = 0;
    y = 0;
  }

  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const tw = ctx.measureText(text).width;
  const padX = 5;
  const padY = 3;
  const boxW = tw + padX * 2;
  const boxH = 12 + padY * 2;

  let bx = x - boxW / 2;
  let by = y - boxH + 2;
  if (baseline === "middle") by = y - boxH / 2;
  if (align === "left") bx = x - padX;
  if (align === "right") bx = x - boxW + padX;

  ctx.fillStyle = maskFill;
  ctx.fillRect(bx, by, boxW, boxH);

  ctx.fillStyle = DIM_TEXT_COLOR;
  ctx.fillText(text, x, y);

  ctx.restore();
}
