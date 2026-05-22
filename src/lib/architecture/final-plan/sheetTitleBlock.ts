import { ARCH } from "./architecturalPalette";
import { escapeXml, SHEET } from "./planGeometryUtils";
import type { PlanLayout, SheetMeta } from "./types";

function formatAreaLine(
  label: string,
  m2: number | null,
  estimated: boolean,
): string | null {
  if (m2 == null || m2 <= 0) return null;
  const suffix = estimated ? " aprox." : "";
  return `${label} ${m2.toFixed(1)} m²${suffix}`;
}

function buildAreaLines(sheet: SheetMeta): string[] {
  const est = sheet.areasEstimated;
  const lines: string[] = [];
  const covered = formatAreaLine("Superficie cubierta", sheet.coveredM2, est);
  const outdoor = formatAreaLine("Superficie exterior", sheet.outdoorM2, est);
  const semi = formatAreaLine("Superficie semi-cubierta", sheet.semiCoveredM2, est);
  if (covered) lines.push(covered);
  if (outdoor) lines.push(outdoor);
  if (semi) lines.push(semi);
  return lines;
}

export function renderOrientativeNorth(layout: PlanLayout): string {
  const cx = layout.planAreaX + layout.planAreaW - 4.2;
  const cy = layout.planAreaY + 3.8;
  const tipY = cy - 2.1;
  return (
    `<g id="north-arrow" pointer-events="none" opacity="0.82">` +
    `<circle cx="${cx}" cy="${cy}" r="2.35" fill="#FFFFFF" stroke="${ARCH.inkSoft}" stroke-width="0.1"/>` +
    `<line x1="${cx}" y1="${cy + 1.1}" x2="${cx}" y2="${tipY}" stroke="${ARCH.inkMuted}" stroke-width="0.18" stroke-linecap="square"/>` +
    `<path d="M ${cx} ${tipY} L ${cx - 0.5} ${tipY + 0.9} L ${cx + 0.5} ${tipY + 0.9} Z" fill="${ARCH.inkMuted}"/>` +
    `<text x="${cx}" y="${cy + 0.35}" text-anchor="middle" dominant-baseline="middle" font-size="0.72" font-family="Arial, Helvetica, sans-serif" font-weight="600" fill="${ARCH.ink}">N</text>` +
    `</g>`
  );
}

export function renderTitleBlock(sheet: SheetMeta): string {
  const tbY = SHEET.height - SHEET.titleBlockH;
  const x0 = SHEET.margin;
  const w = SHEET.width - SHEET.margin * 2;
  const rightX = x0 + w;
  const splitX = x0 + w * 0.54;

  const areaLines = buildAreaLines(sheet);
  const yProject = tbY + 2.4;
  const yTitle = tbY + 3.8;
  const yVariant = tbY + 5.5;
  const yArea1 = tbY + 7.1;
  const yArea2 = tbY + 8.5;
  const yScale = tbY + 3.5;
  const yDims = tbY + 5.1;
  const yLegal1 = tbY + 7.8;
  const yLegal2 = tbY + 9.2;
  const yLegal3 = tbY + 10.6;

  const projectLine =
    sheet.projectTitle && sheet.projectTitle !== sheet.variantLabel
      ? `<text x="${x0 + 0.15}" y="${yProject}" font-size="0.68" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkSoft}">${escapeXml(sheet.projectTitle)}</text>`
      : "";

  return (
    `<g id="title-block" pointer-events="none">` +
    `<rect x="${x0}" y="${tbY}" width="${w}" height="${SHEET.titleBlockH}" fill="${ARCH.sheetStrip}"/>` +
    `<line x1="${x0}" y1="${tbY + 0.4}" x2="${x0 + w}" y2="${tbY + 0.4}" stroke="${ARCH.rule}" stroke-width="0.1"/>` +
    `<line x1="${splitX}" y1="${tbY + 1}" x2="${splitX}" y2="${tbY + SHEET.titleBlockH - 0.6}" stroke="${ARCH.rule}" stroke-width="0.05" opacity="0.5"/>` +
    projectLine +
    `<text x="${x0 + 0.15}" y="${yTitle}" font-size="1.14" font-family="Georgia, 'Times New Roman', serif" font-weight="600" letter-spacing="0.02" fill="${ARCH.ink}">Planta preliminar</text>` +
    `<text x="${x0 + 0.15}" y="${yVariant}" font-size="0.9" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.ink}">${escapeXml(sheet.variantLabel)}</text>` +
    (areaLines[0]
      ? `<text x="${x0 + 0.15}" y="${yArea1}" font-size="0.74" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkMuted}">${escapeXml(areaLines[0])}</text>`
      : "") +
    (areaLines[1]
      ? `<text x="${x0 + 0.15}" y="${yArea2}" font-size="0.74" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkMuted}">${escapeXml(areaLines[1])}</text>`
      : "") +
    (areaLines[2]
      ? `<text x="${x0 + 0.15}" y="${tbY + 9.9}" font-size="0.74" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkMuted}">${escapeXml(areaLines[2])}</text>`
      : "") +
    `<text x="${rightX - 0.15}" y="${yScale}" text-anchor="end" font-size="0.74" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkMuted}">Escala conceptual / S.E.</text>` +
    (sheet.showPreliminaryDimensions
      ? `<text x="${rightX - 0.15}" y="${yDims}" text-anchor="end" font-size="0.68" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkSoft}">Medidas preliminares estimadas</text>`
      : "") +
    `<text x="${rightX - 0.15}" y="${yLegal1}" text-anchor="end" font-size="0.68" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkSoft}">No apto para obra</text>` +
    `<text x="${rightX - 0.15}" y="${yLegal2}" text-anchor="end" font-size="0.66" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkSoft}">Sin validez municipal</text>` +
    `<text x="${rightX - 0.15}" y="${yLegal3}" text-anchor="end" font-size="0.66" font-family="Arial, Helvetica, sans-serif" fill="${ARCH.inkSoft}">Revisión profesional requerida</text>` +
    `</g>`
  );
}

export function renderSheetFrame(): string {
  return (
    `<rect x="0" y="0" width="${SHEET.width}" height="${SHEET.height}" fill="${ARCH.paper}"/>` +
    `<rect x="${SHEET.margin - 0.5}" y="${SHEET.margin - 0.5}" ` +
    `width="${SHEET.width - SHEET.margin * 2 + 1}" height="${SHEET.height - SHEET.titleBlockH - SHEET.margin}" ` +
    `fill="none" stroke="${ARCH.rule}" stroke-width="0.1"/>`
  );
}
