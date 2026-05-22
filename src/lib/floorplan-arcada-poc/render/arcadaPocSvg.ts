import type {
  ArcadaPocOpening,
  ArcadaPocRoom,
  ArcadaPocScene,
  ArcadaPocWall,
} from "../types/arcadaPocTypes";
import type { ArcadaPocRenderResult } from "../types/arcadaPocTypes";

const INK = "#111827";
const INK_MUTED = "#64748B";
const WINDOW = "#6B8CAE";
const FURNITURE = "#94A3B8";

const FILL_BY_TYPE: Record<string, string> = {
  social: "#FAFAF9",
  private: "#F9F8FB",
  service: "#F8FAFC",
  circulation: "#F5F5F4",
  work: "#F7FAF8",
  flex: "#FAFAFA",
  outdoor: "#F5F7F5",
  semi_outdoor: "#F8FAF8",
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function polygonPoints(room: ArcadaPocRoom): string {
  return room.polygon.map((p) => `${p.x},${p.y}`).join(" ");
}

function renderRoom(room: ArcadaPocRoom): string {
  const fill =
    room.areaKind === "outdoor" || room.areaKind === "semi_covered"
      ? FILL_BY_TYPE.outdoor
      : (FILL_BY_TYPE[room.type] ?? FILL_BY_TYPE.flex);
  const dash =
    room.areaKind === "outdoor" || room.areaKind === "semi_covered"
      ? ' stroke="#CBD5E1" stroke-width="0.22" stroke-dasharray="2.4 1.2"'
      : "";
  const hatch =
    room.areaKind === "outdoor"
      ? `<polygon points="${polygonPoints(room)}" fill="url(#arcada-pat-outdoor)" opacity="0.85"/>`
      : "";
  return (
    `<polygon points="${polygonPoints(room)}" fill="${fill}" stroke="none"/>` +
    hatch +
    `<polygon points="${polygonPoints(room)}" fill="none"${dash}/>`
  );
}

function renderWall(w: ArcadaPocWall): string {
  const stroke = w.kind === "exterior" ? INK : INK_MUTED;
  const width = w.thickness;
  const dash = w.dashed ? ' stroke-dasharray="2.4 1.2"' : "";
  return (
    `<line x1="${w.from.x}" y1="${w.from.y}" x2="${w.to.x}" y2="${w.to.y}" ` +
    `stroke="${stroke}" stroke-width="${width}" stroke-linecap="square" stroke-linejoin="miter"${dash}/>`
  );
}

function renderOpening(op: ArcadaPocOpening): string {
  const gap = `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="#FFFFFF" stroke-width="1.1" stroke-linecap="butt"/>`;

  if (op.type === "window") {
    const dx = op.x2 - op.x1;
    const dy = op.y2 - op.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 0.2;
    const ny = (dx / len) * 0.2;
    return (
      `<g class="arcada-window">` +
      gap +
      `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="${WINDOW}" stroke-width="0.28"/>` +
      `<line x1="${op.x1 + nx}" y1="${op.y1 + ny}" x2="${op.x2 + nx}" y2="${op.y2 + ny}" stroke="${WINDOW}" stroke-width="0.14" opacity="0.85"/>` +
      `</g>`
    );
  }

  if (op.type === "open_passage" || op.type === "wide_sliding") {
    return (
      `<g class="arcada-passage">` +
      gap +
      `<line x1="${op.x1}" y1="${op.y1}" x2="${op.x2}" y2="${op.y2}" stroke="${INK_MUTED}" stroke-width="0.2" stroke-dasharray="0.4 0.35"/>` +
      `</g>`
    );
  }

  const mx = (op.x1 + op.x2) / 2;
  const my = (op.y1 + op.y2) / 2;
  const hingeX = op.x1;
  const hingeY = op.y1;
  const r = Math.hypot(op.x2 - op.x1, op.y2 - op.y1) * 0.9;
  return (
    `<g class="arcada-door">` +
    gap +
    `<line x1="${hingeX}" y1="${hingeY}" x2="${mx}" y2="${my}" stroke="${INK_MUTED}" stroke-width="0.22"/>` +
    `<path d="M ${hingeX} ${hingeY} A ${r} ${r} 0 0 1 ${mx} ${my}" fill="none" stroke="${INK_MUTED}" stroke-width="0.16" stroke-dasharray="0.3 0.25" opacity="0.75"/>` +
    `</g>`
  );
}

function renderFurniture(f: ArcadaPocScene["furniture"][0]): string {
  if (f.width <= 0 || f.height <= 0) return "";
  return (
    `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" ` +
    `fill="none" stroke="${FURNITURE}" stroke-width="0.08" opacity="0.45"/>`
  );
}

function renderLabels(scene: ArcadaPocScene): string {
  return scene.labels
    .map((lb) => {
      const nameSize = 0.95;
      const areaSize = 0.72;
      const area = lb.areaText
        ? `<text x="${lb.x}" y="${lb.y + 1.1}" text-anchor="middle" font-size="${areaSize}" fill="${INK_MUTED}">${escapeXml(lb.areaText)}</text>`
        : "";
      return (
        `<g class="arcada-label">` +
        `<text x="${lb.x}" y="${lb.y - (lb.areaText ? 0.4 : 0)}" text-anchor="middle" font-size="${nameSize}" font-weight="500" fill="${INK}">${escapeXml(lb.name)}</text>` +
        area +
        `</g>`
      );
    })
    .join("");
}

export function renderArcadaPocSvg(
  scene: ArcadaPocScene,
  options: { title?: string; variantLabel?: string } = {},
): ArcadaPocRenderResult {
  const pad = 4;
  const viewBox = `${-pad} ${-pad} ${scene.canvas.width + pad * 2} ${scene.canvas.height + pad * 2}`;

  const defs = `<defs>
  <pattern id="arcada-pat-outdoor" width="2.5" height="2.5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
    <line x1="0" y1="0" x2="0" y2="2.5" stroke="#CBD5E1" stroke-width="0.08" opacity="0.4"/>
  </pattern>
</defs>`;

  const title = options.title ?? "Planta";
  const variant = options.variantLabel ?? "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ` +
    `role="img" aria-label="${escapeXml(title)} — Arcada POC">` +
    `<title>${escapeXml(title)}${variant ? ` — ${escapeXml(variant)}` : ""} (Arcada POC)</title>` +
    `<desc>Render experimental Arcada — planta preliminar conceptual</desc>` +
    defs +
    `<rect x="${-pad}" y="${-pad}" width="${scene.canvas.width + pad * 2}" height="${scene.canvas.height + pad * 2}" fill="#FFFFFF"/>` +
    `<g id="arcada-rooms">${scene.rooms.map(renderRoom).join("")}</g>` +
    `<g id="arcada-walls">${scene.walls.map(renderWall).join("")}</g>` +
    `<g id="arcada-openings">${scene.openings.map(renderOpening).join("")}</g>` +
    `<g id="arcada-furniture">${scene.furniture.map(renderFurniture).join("")}</g>` +
    `<g id="arcada-labels">${renderLabels(scene)}</g>` +
    `<text x="${scene.canvas.width / 2}" y="${scene.canvas.height + pad - 1.2}" text-anchor="middle" font-size="0.65" fill="${INK_MUTED}">Arcada POC · ${escapeXml(scene.canvas.scaleLabel ?? "")} · No apto para obra</text>` +
    `</svg>`;

  return { svg, viewBox, warnings: [] };
}
