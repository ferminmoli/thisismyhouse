import { escapeXml, SHEET } from "./planGeometryUtils";
import type { PlanLayout, SheetMeta } from "./types";

const INK = "#1E293B";
const MUTED = "#64748B";
const SOFT = "#94A3B8";
const RULE = "#E2E8F0";
const STRIP = "#FAFAF9";
const DIVIDER = "#E2E8F0";

function formatAreaParts(sheet: SheetMeta): string[] {
  const est = sheet.areasEstimated ? " est." : "";
  const parts: string[] = [];
  if (sheet.coveredM2 != null) {
    parts.push(`Cubierta ${sheet.coveredM2.toFixed(1)} m²${est}`);
  }
  if (sheet.outdoorM2 != null && sheet.outdoorM2 > 0) {
    parts.push(`Exterior ${sheet.outdoorM2.toFixed(1)} m²${est}`);
  }
  if (sheet.semiCoveredM2 != null && sheet.semiCoveredM2 > 0) {
    parts.push(`Semi ${sheet.semiCoveredM2.toFixed(1)} m²${est}`);
  }
  return parts;
}

export function renderOrientativeNorth(layout: PlanLayout): string {
  const cx = layout.planAreaX + layout.planAreaW - 4;
  const cy = layout.planAreaY + 3.5;
  return (
    `<g id="north-orientativo" pointer-events="none" opacity="0.7">` +
    `<circle cx="${cx}" cy="${cy}" r="2.2" fill="#FFFFFF" stroke="${MUTED}" stroke-width="0.1"/>` +
    `<path d="M ${cx} ${cy - 1.3} L ${cx - 0.45} ${cy + 0.75} L ${cx} ${cy + 0.3} L ${cx + 0.45} ${cy + 0.75} Z" fill="${MUTED}"/>` +
    `<text x="${cx}" y="${cy + 2.4}" text-anchor="middle" font-size="0.65" font-family="Arial,sans-serif" fill="${MUTED}">N orientativo</text>` +
    `</g>`
  );
}

export function renderTitleBlock(sheet: SheetMeta): string {
  const tbY = SHEET.height - SHEET.titleBlockH;
  const x0 = SHEET.margin;
  const w = SHEET.width - SHEET.margin * 2;
  const rightX = x0 + w;
  const splitX = x0 + w * 0.56;

  const areaParts = formatAreaParts(sheet);
  const areasLine = areaParts.length > 0 ? areaParts.join("  ·  ") : "";

  const yTitle = tbY + 3.1;
  const yVariant = tbY + 5.1;
  const yAreas = tbY + 6.9;
  const yScale = tbY + 3.1;
  const yDims = tbY + 4.85;
  const yDisclaimer = tbY + 11.2;

  return (
    `<g id="title-block" pointer-events="none">` +
    `<rect x="${x0}" y="${tbY}" width="${w}" height="${SHEET.titleBlockH}" fill="${STRIP}"/>` +
    `<line x1="${x0}" y1="${tbY + 0.4}" x2="${x0 + w}" y2="${tbY + 0.4}" stroke="${RULE}" stroke-width="0.1"/>` +
    `<line x1="${splitX}" y1="${tbY + 1.1}" x2="${splitX}" y2="${tbY + SHEET.titleBlockH - 0.7}" stroke="${DIVIDER}" stroke-width="0.05" opacity="0.55"/>` +
    `<text x="${x0 + 0.15}" y="${yTitle}" font-size="1.18" font-family="Georgia, 'Times New Roman', serif" font-weight="600" letter-spacing="0.02" fill="${INK}">Planta preliminar</text>` +
    `<text x="${x0 + 0.15}" y="${yVariant}" font-size="0.92" font-family="Arial, Helvetica, sans-serif" fill="${INK}">${escapeXml(sheet.variantLabel)}</text>` +
    (areasLine
      ? `<text x="${x0 + 0.15}" y="${yAreas}" font-size="0.78" font-family="Arial, Helvetica, sans-serif" fill="${MUTED}">${escapeXml(areasLine)}</text>`
      : "") +
    `<text x="${rightX - 0.15}" y="${yScale}" text-anchor="end" font-size="0.76" font-family="Arial, Helvetica, sans-serif" fill="${MUTED}">Escala conceptual / S.E.</text>` +
    (sheet.showPreliminaryDimensions
      ? `<text x="${rightX - 0.15}" y="${yDims}" text-anchor="end" font-size="0.7" font-family="Arial, Helvetica, sans-serif" fill="${SOFT}">Medidas preliminares estimadas</text>`
      : "") +
    `<text x="${rightX - 0.15}" y="${yDisclaimer}" text-anchor="end" font-size="0.7" font-family="Arial, Helvetica, sans-serif" fill="${SOFT}">No apto para obra</text>` +
    `</g>`
  );
}

export function renderSheetFrame(): string {
  return (
    `<rect x="0" y="0" width="${SHEET.width}" height="${SHEET.height}" fill="#FFFFFF"/>` +
    `<rect x="${SHEET.margin - 0.5}" y="${SHEET.margin - 0.5}" ` +
    `width="${SHEET.width - SHEET.margin * 2 + 1}" height="${SHEET.height - SHEET.titleBlockH - SHEET.margin}" ` +
    `fill="none" stroke="#E7E5E4" stroke-width="0.08"/>`
  );
}
