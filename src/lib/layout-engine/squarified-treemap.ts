type LayoutRect = { x: number; y: number; w: number; h: number };

export type TreemapItem = { index: number; area: number };

/**
 * Squarified treemap — partitions a rectangle by area with low aspect-ratio distortion.
 * @see Bruls, Huizing, van Wijk (2000)
 */
export function squarifiedTreemap(
  x: number,
  y: number,
  w: number,
  h: number,
  areas: number[],
): Array<{ x: number; y: number; w: number; h: number }> {
  const n = areas.length;
  if (n === 0) return [];
  const total = areas.reduce((s, a) => s + a, 0);
  if (total <= 0 || w <= 0 || h <= 0) {
    return areas.map(() => ({ x, y, w: 0, h: 0 }));
  }

  const items: TreemapItem[] = areas
    .map((area, index) => ({ index, area: Math.max(area, 0.001) }))
    .sort((a, b) => b.area - a.area);

  const out: LayoutRect[] = new Array(n).fill(null).map(() => ({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
  }));

  let remaining = [...items];
  let rx = x;
  let ry = y;
  let rw = w;
  let rh = h;

  while (remaining.length > 0) {
    const horizontal = rw >= rh;
    const row: TreemapItem[] = [];
    let rowArea = 0;

    while (remaining.length > 0) {
      const next = remaining[0];
      const testArea = rowArea + next.area;
      const testItems = [...row, next];
      const currentWorst = row.length
        ? worstRatio(horizontal ? rh : rw, rowArea, row)
        : Infinity;
      const testWorst = worstRatio(
        horizontal ? rh : rw,
        testArea,
        testItems,
      );

      if (row.length === 0 || testWorst <= currentWorst) {
        row.push(remaining.shift()!);
        rowArea += next.area;
      } else {
        break;
      }
    }

    if (horizontal) {
      const rowH = rowArea / rw;
      let cx = rx;
      for (const item of row) {
        const cw = item.area / rowH;
        out[item.index] = { x: cx, y: ry, w: cw, h: rowH };
        cx += cw;
      }
      ry += rowH;
      rh -= rowH;
    } else {
      const rowW = rowArea / rh;
      let cy = ry;
      for (const item of row) {
        const ch = item.area / rowW;
        out[item.index] = { x: rx, y: cy, w: rowW, h: ch };
        cy += ch;
      }
      rx += rowW;
      rw -= rowW;
    }
  }

  return out;
}

function worstRatio(
  side: number,
  rowSum: number,
  row: TreemapItem[],
): number {
  if (rowSum <= 0 || side <= 0 || row.length === 0) return Infinity;
  const min = Math.min(...row.map((r) => r.area));
  const max = Math.max(...row.map((r) => r.area));
  const s2 = rowSum * rowSum;
  const side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}
