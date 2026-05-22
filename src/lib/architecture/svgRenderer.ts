import type { GeneratedPlan, RenderDoor, RenderWindow, RenderZone, FurnitureHint } from "./generatedPlan";
import { NORMALIZED_CANVAS } from "./planMetadata";
import { enclosureOfZone } from "./spaceClassification";
import type { SvgLegendItem, SvgPlanRender } from "./floorPlanPipelineTypes";

const VIEW_BOX = `0 0 ${NORMALIZED_CANVAS.width} ${NORMALIZED_CANVAS.height}`;

const ZONE_FILL: Record<string, string> = {
  covered_social: "#FFF4E0",
  covered_private: "#EDE8F5",
  covered_service: "#E8F0F8",
  covered_circulation: "#F0F0F0",
  covered_default: "#F5F2EB",
  semi_covered: "#E3F2E8",
  outdoor: "#D4EBD4",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function zoneFill(zone: RenderZone): string {
  const enc = enclosureOfZone(zone);
  if (enc === "outdoor") return ZONE_FILL.outdoor;
  if (enc === "semi_covered") return ZONE_FILL.semi_covered;
  if (zone.type === "social") return ZONE_FILL.covered_social;
  if (zone.type === "private") return ZONE_FILL.covered_private;
  if (zone.type === "service") return ZONE_FILL.covered_service;
  if (zone.type === "circulation") return ZONE_FILL.covered_circulation;
  return ZONE_FILL.covered_default;
}

function zoneStroke(zone: RenderZone): string {
  const enc = enclosureOfZone(zone);
  if (enc === "outdoor") return "#5A8F5A";
  if (enc === "semi_covered") return "#6B9E7A";
  return "#8B7355";
}

function defaultLegend(): SvgLegendItem[] {
  return [
    { key: "covered", label: "Cubierto", color: ZONE_FILL.covered_default },
    { key: "semi", label: "Semi-cubierto", color: ZONE_FILL.semi_covered },
    { key: "outdoor", label: "Exterior / patio", color: ZONE_FILL.outdoor },
    { key: "door", label: "Puerta / paso", color: "#5C4033" },
    { key: "window", label: "Ventana", color: "#4A90D9" },
  ];
}

function doorSegment(
  door: RenderDoor,
  zones: RenderZone[],
): string | null {
  const fromZ = zones.find((z) => z.id === door.from);
  const toZ = zones.find((z) => z.id === door.to);
  if (!fromZ || !toZ) return null;

  const wall = door.wall;
  const t = Math.max(0.05, Math.min(0.95, door.position));
  const w = Math.max(0.8, door.width * 0.15);

  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;

  if (wall === "top") {
    x1 = fromZ.x + fromZ.width * t;
    y1 = fromZ.y;
    x2 = x1 + w;
    y2 = y1;
  } else if (wall === "bottom") {
    x1 = fromZ.x + fromZ.width * t;
    y1 = fromZ.y + fromZ.height;
    x2 = x1 + w;
    y2 = y1;
  } else if (wall === "left") {
    x1 = fromZ.x;
    y1 = fromZ.y + fromZ.height * t;
    x2 = x1;
    y2 = y1 + w;
  } else {
    x1 = fromZ.x + fromZ.width;
    y1 = fromZ.y + fromZ.height * t;
    x2 = x1;
    y2 = y1 + w;
  }

  const dash = door.type === "open_passage" ? ' stroke-dasharray="1.2 0.8"' : "";
  const color = door.type === "sliding" ? "#7A5C3E" : "#5C4033";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="0.6"${dash}/>`;
}

function windowSegment(win: RenderWindow, zones: RenderZone[]): string | null {
  const z = zones.find((zone) => zone.id === win.zoneId);
  if (!z) return null;
  const t = Math.max(0.05, Math.min(0.95, win.position));
  const len = Math.max(1, win.width * 0.12);
  let x1 = 0;
  let y1 = 0;
  let x2 = 0;
  let y2 = 0;
  if (win.wall === "top") {
    x1 = z.x + z.width * t;
    y1 = z.y;
    x2 = x1 + len;
    y2 = y1;
  } else if (win.wall === "bottom") {
    x1 = z.x + z.width * t;
    y1 = z.y + z.height;
    x2 = x1 + len;
    y2 = y1;
  } else if (win.wall === "left") {
    x1 = z.x;
    y1 = z.y + z.height * t;
    x2 = x1;
    y2 = y1 + len;
  } else {
    x1 = z.x + z.width;
    y1 = z.y + z.height * t;
    x2 = x1;
    y2 = y1 + len;
  }
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4A90D9" stroke-width="0.5"/>`;
}

function furnitureBlock(f: FurnitureHint): string {
  return `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" fill="#B0A090" fill-opacity="0.35" stroke="#8B7355" stroke-width="0.15" rx="0.3"/>`;
}

export type RenderPlanSvgParams = {
  variantId: string;
  variantLabel: string;
  plan: GeneratedPlan;
  title?: string;
};

export function renderPlanToSvg(params: RenderPlanSvgParams): SvgPlanRender {
  const { plan, variantId, variantLabel } = params;
  const title = params.title ?? plan.title;
  const warnings: string[] = [
    "Plano conceptual en coordenadas normalizadas (no es documento de obra).",
    ...(plan.metadata.warnings ?? []),
  ];

  const zones = [...plan.zones].sort(
    (a, b) => enclosureOfZone(a).localeCompare(enclosureOfZone(b)),
  );

  const zoneRects = zones
    .map((z) => {
      const label = z.label || z.sourceRoomId;
      const fs = Math.min(z.width, z.height) * 0.22;
      const fontSize = Math.max(1.2, Math.min(3.2, fs));
      return (
        `<g data-zone="${escapeXml(z.sourceRoomId)}">` +
        `<rect x="${z.x}" y="${z.y}" width="${z.width}" height="${z.height}" ` +
        `fill="${zoneFill(z)}" stroke="${zoneStroke(z)}" stroke-width="0.25"/>` +
        `<text x="${z.x + z.width / 2}" y="${z.y + z.height / 2}" ` +
        `text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" ` +
        `font-family="system-ui,sans-serif" fill="#333">${escapeXml(label)}</text>` +
        `</g>`
      );
    })
    .join("\n");

  const doors = plan.doors
    .map((d) => doorSegment(d, plan.zones))
    .filter(Boolean)
    .join("\n");
  const windows = plan.windows
    .map((w) => windowSegment(w, plan.zones))
    .filter(Boolean)
    .join("\n");
  const furniture = plan.furniture.map(furnitureBlock).join("\n");

  const legendMarkup = defaultLegend()
    .map(
      (item, i) =>
        `<rect x="2" y="${2 + i * 3.5}" width="2.5" height="2" fill="${item.color}" stroke="#666" stroke-width="0.1"/>` +
        `<text x="5.2" y="${3.4 + i * 3.5}" font-size="1.8" font-family="system-ui,sans-serif" fill="#444">${escapeXml(item.label)}</text>`,
    )
    .join("\n");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW_BOX}" role="img" aria-label="${escapeXml(title)}">` +
    `<title>${escapeXml(title)} — ${escapeXml(variantLabel)}</title>` +
    `<rect width="100" height="100" fill="#FAFAF8"/>` +
    zoneRects +
    furniture +
    doors +
    windows +
    `<g id="legend">${legendMarkup}</g>` +
    `<text x="50" y="98" text-anchor="middle" font-size="2" fill="#666" font-family="system-ui,sans-serif">Conceptual · no construcción</text>` +
    `</svg>`;

  return {
    variantId,
    variantLabel,
    svg,
    viewBox: VIEW_BOX,
    coordinateSystem: "normalized_canvas",
    legend: defaultLegend(),
    warnings,
  };
}

export function renderVariantsToSvg(
  variants: Array<{ mutationType: string; label: string; plan: GeneratedPlan }>,
): SvgPlanRender[] {
  return variants.map((v) =>
    renderPlanToSvg({
      variantId: v.mutationType,
      variantLabel: v.label,
      plan: v.plan,
    }),
  );
}
