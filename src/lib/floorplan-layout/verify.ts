import { cellsForZoneId, occupancyToAllCells, trueCellAreaPx } from "./grid-bbox";
import { CELL_SIZE_PX } from "./grid-scale";
import { parseCellKey, cellIsBuildable } from "./lot-mask";
import { buildableAreaPx } from "./lot-mask";
import type { LotMask } from "./types";
import { containerArea } from "./lot-container";
import { rectArea, rectsInsideMask, rectsOverlap } from "./geometry";
import type { LayoutRect, LotContainer, PlacedZoneRect } from "./types";

export function verifyLayoutCoverage(
  container: LotContainer,
  zones: PlacedZoneRect[],
): string[] {
  const issues: string[] = [];
  const total = containerArea(container);
  const sum = zones.reduce((s, z) => s + rectArea(z), 0);
  const fillRatio = sum / total;

  if (Math.abs(fillRatio - 1) > 0.02) {
    issues.push(
      `Cobertura de área ${(fillRatio * 100).toFixed(1)}% (esperado ~100%)`,
    );
  }

  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      if (rectsOverlap(zones[i], zones[j])) {
        issues.push(`Solape entre ${zones[i].id} y ${zones[j].id}`);
      }
    }
  }

  const outOfBounds = zones.filter(
    (z) =>
      z.x < container.x - 0.5 ||
      z.y < container.y - 0.5 ||
      z.x + z.width > container.x + container.width + 0.5 ||
      z.y + z.height > container.y + container.height + 0.5,
  );
  if (outOfBounds.length > 0) {
    issues.push(
      `Zonas fuera del lote: ${outOfBounds.map((z) => z.id).join(", ")}`,
    );
  }

  return issues;
}

/** Verifica mapa celda→zona: sin duplicados ni celdas void ocupadas. */
export function verifyCellOccupancy(
  mask: LotMask,
  cellOccupancy: Record<string, string>,
): string[] {
  const issues: string[] = [];
  const keys = Object.keys(cellOccupancy);

  if (keys.length !== mask.buildableCellCount) {
    issues.push(
      `Celdas ocupadas ${keys.length}/${mask.buildableCellCount} (debe cubrir 100% sin duplicar)`,
    );
  }

  const seen = new Set<string>();
  for (const key of keys) {
    const parsed = parseCellKey(key);
    if (!parsed) {
      issues.push(`Clave de celda inválida: ${key}`);
      continue;
    }
    if (!cellIsBuildable(parsed.col, parsed.row, mask)) {
      issues.push(`Celda no habitable ocupada: ${key} → ${cellOccupancy[key]}`);
    }
    if (seen.has(key)) {
      issues.push(`Celda duplicada en occupancy: ${key}`);
    }
    seen.add(key);
  }

  return issues;
}

export function verifyLayoutOnMask(
  mask: LotMask,
  zones: PlacedZoneRect[],
  cellOccupancy?: Record<string, string>,
): string[] {
  const issues: string[] = [];

  for (const z of zones) {
    if (!rectsInsideMask(z, mask)) {
      issues.push(`${z.id}: rectángulo fuera del polígono habitable (L)`);
    }
  }

  if (cellOccupancy && Object.keys(cellOccupancy).length > 0) {
    issues.push(...verifyCellOccupancy(mask, cellOccupancy));

    const allCells = occupancyToAllCells(cellOccupancy);
    let sumBboxPx = 0;
    let sumCellPx = 0;
    for (const z of zones) {
      const zoneCells = cellsForZoneId(allCells, z.id);
      sumCellPx += trueCellAreaPx(zoneCells.length, CELL_SIZE_PX);
      sumBboxPx += rectArea(z);
    }
    const buildablePx = buildableAreaPx(mask);
    if (buildablePx > 0 && sumBboxPx / buildablePx > 1.15) {
      issues.push(
        `Suma bbox zonas ${((sumBboxPx / buildablePx) * 100).toFixed(0)}% vs celdas reales ${((sumCellPx / buildablePx) * 100).toFixed(0)}%`,
      );
    }
    return issues;
  }

  return issues;
}

/** Ajuste final: fuerza el último rectángulo a cerrar el borde del contenedor (sin gaps). */
export function snapLayoutToContainer(
  container: LayoutRect,
  zones: PlacedZoneRect[],
): PlacedZoneRect[] {
  if (zones.length === 0) return zones;

  const maxX = Math.max(...zones.map((z) => z.x + z.width));
  const maxY = Math.max(...zones.map((z) => z.y + z.height));
  const dx = container.x + container.width - maxX;
  const dy = container.y + container.height - maxY;

  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return zones;

  const rightmost = zones.filter(
    (z) => Math.abs(z.x + z.width - maxX) < 0.5,
  );
  const bottommost = zones.filter(
    (z) => Math.abs(z.y + z.height - maxY) < 0.5,
  );

  return zones.map((z) => {
    let { width, height } = z;
    if (rightmost.some((r) => r.id === z.id) && Math.abs(dx) > 0.01) {
      width += dx;
    }
    if (bottommost.some((b) => b.id === z.id) && Math.abs(dy) > 0.01) {
      height += dy;
    }
    return { ...z, width, height };
  });
}
