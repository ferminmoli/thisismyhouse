import type { ProgramZoneType } from "@/lib/architectural-program/types";
import type {
  FloorplanLayoutResult,
  PlacedZoneRect,
} from "@/lib/floorplan-layout/types";
import { BASE_WALL_INSET_PX, ZONE_FILL_BY_TYPE } from "./render-base-floorplan";

const LABEL_FONT =
  "bold 13px 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SUB_FONT =
  "500 11px 'Helvetica Neue', Helvetica, Arial, sans-serif";
const TEXT_COLOR = "#0f172a";
const LINE_HEIGHT = 14;
const SUB_LINE_HEIGHT = 12;
const PAD_X = 6;
const PAD_Y = 4;
const MIN_ZONE_W = 44;
const MIN_ZONE_H = 30;
const MIN_HEIGHT_FOR_AREA = 50;

type LabelBox = { x: number; y: number; width: number; height: number };

export type DrawSmartLabelsOptions = {
  /** Superficie total del programa (m²) para estimar área por zona. */
  targetTotalAreaM2?: number;
  /** mapa id → idealAreaM2 del programa (prioridad sobre estimación). */
  areaByZoneId?: Record<string, number>;
};

function fillForType(type: ProgramZoneType): string {
  return ZONE_FILL_BY_TYPE[type] ?? "#fafaf9";
}

function boxesOverlap(a: LabelBox, b: LabelBox, gap = 3): boolean {
  return (
    a.x < b.x + b.width + gap &&
    b.x < a.x + a.width + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  );
}

function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return `${t}…`;
}

function resolveAreaM2(
  zone: PlacedZoneRect,
  layout: FloorplanLayoutResult,
  options: DrawSmartLabelsOptions,
): number | null {
  if (options.areaByZoneId?.[zone.id] != null) {
    return options.areaByZoneId[zone.id];
  }
  const target = options.targetTotalAreaM2;
  if (!target || target <= 0) return null;
  const lotPx = layout.container.width * layout.container.height;
  const zonePx = zone.width * zone.height;
  if (lotPx <= 0) return null;
  return (zonePx / lotPx) * target;
}

function measureLabelBlock(
  ctx: CanvasRenderingContext2D,
  mainLine: string,
  subLine: string | null,
): { width: number; height: number; lines: string[] } {
  ctx.font = LABEL_FONT;
  const w1 = ctx.measureText(mainLine).width;
  let w2 = 0;
  const lines = [mainLine];
  if (subLine) {
    ctx.font = SUB_FONT;
    w2 = ctx.measureText(subLine).width;
    lines.push(subLine);
  }
  const width = Math.max(w1, w2) + PAD_X * 2;
  const height =
    (subLine ? LINE_HEIGHT + SUB_LINE_HEIGHT : LINE_HEIGHT) + PAD_Y * 2;
  return { width, height, lines };
}

function drawOcclusionMask(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  boxW: number,
  boxH: number,
  fill: string,
): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);
  ctx.restore();
}

function drawLabelLines(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  lines: string[],
  hasSub: boolean,
): void {
  ctx.save();
  ctx.fillStyle = TEXT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (!hasSub) {
    ctx.font = LABEL_FONT;
    ctx.fillText(lines[0], centerX, centerY);
    ctx.restore();
    return;
  }

  const blockH = LINE_HEIGHT + SUB_LINE_HEIGHT;
  let y = centerY - blockH / 2 + LINE_HEIGHT / 2;

  ctx.font = LABEL_FONT;
  ctx.fillText(lines[0], centerX, y);
  y += LINE_HEIGHT / 2 + SUB_LINE_HEIGHT / 2;
  ctx.font = SUB_FONT;
  ctx.fillStyle = "#334155";
  ctx.fillText(lines[1], centerX, y);

  ctx.restore();
}

/**
 * Etiquetas con máscara de oclusión — después de muros/aberturas, antes de cotas.
 */
export function drawSmartLabels(
  ctx: CanvasRenderingContext2D,
  layout: FloorplanLayoutResult,
  options: DrawSmartLabelsOptions = {},
): void {
  const placed: LabelBox[] = [];
  const sorted = [...layout.zones].sort(
    (a, b) => b.width * b.height - a.width * a.height,
  );

  for (const zone of sorted) {
    const innerW = zone.width - BASE_WALL_INSET_PX * 2;
    const innerH = zone.height - BASE_WALL_INSET_PX * 2;
    if (innerW < MIN_ZONE_W || innerH < MIN_ZONE_H) continue;

    const centerX = zone.x + zone.width / 2;
    const centerY = zone.y + zone.height / 2;

    const maskFill = fillForType(zone.type);
    const maxTextW = innerW - PAD_X * 2 - 4;

    ctx.font = LABEL_FONT;
    let mainLine = truncateToWidth(ctx, zone.label.trim(), maxTextW);

    let subLine: string | null = null;
    if (zone.height > MIN_HEIGHT_FOR_AREA) {
      const m2 = resolveAreaM2(zone, layout, options);
      if (m2 != null && m2 > 0.5) {
        subLine = `${m2.toFixed(1)} m²`;
      }
    }

    let block = measureLabelBlock(ctx, mainLine, subLine);

    let box: LabelBox = {
      x: centerX - block.width / 2,
      y: centerY - block.height / 2,
      width: block.width,
      height: block.height,
    };

    const collides = () => placed.some((p) => boxesOverlap(box, p));

    if (collides() && subLine) {
      subLine = null;
      block = measureLabelBlock(ctx, mainLine, null);
      box = {
        x: centerX - block.width / 2,
        y: centerY - block.height / 2,
        width: block.width,
        height: block.height,
      };
    }

    if (collides()) {
      const short = truncateToWidth(
        ctx,
        zone.id.replace(/_/g, " "),
        maxTextW * 0.85,
      );
      mainLine = short;
      block = measureLabelBlock(ctx, mainLine, null);
      box = {
        x: centerX - block.width / 2,
        y: centerY - block.height / 2,
        width: block.width,
        height: block.height,
      };
    }

    if (collides()) continue;

    if (
      box.x < zone.x + BASE_WALL_INSET_PX ||
      box.y < zone.y + BASE_WALL_INSET_PX ||
      box.x + box.width > zone.x + zone.width - BASE_WALL_INSET_PX ||
      box.y + box.height > zone.y + zone.height - BASE_WALL_INSET_PX
    ) {
      continue;
    }

    drawOcclusionMask(ctx, centerX, centerY, block.width, block.height, maskFill);
    drawLabelLines(ctx, centerX, centerY, block.lines, Boolean(subLine));
    placed.push(box);
  }

  ctx.setLineDash([]);
}
