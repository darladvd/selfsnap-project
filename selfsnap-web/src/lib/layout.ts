// src/lib/layout.ts
export type Rect = { x: number; y: number; w: number; h: number };

export type GridLayoutOptions = {
  canvasW: number;          // required
  canvasH: number;          // required
  sideMargin?: number;      // left/right padding
  topMargin?: number;       // reserved header space
  bottomReserved?: number;  // reserved footer space
  colGap?: number;          // gap between columns
  rowGap?: number;          // gap between rows
  aspectW?: number;         // default 3
  aspectH?: number;         // default 4
};

/**
 * Computes a 2x2 grid of 4 slots inside a canvas.
 * Each slot is aspectW:aspectH (default 3:4), centered with even gaps.
 */
export function compute4GridSlots(opts: GridLayoutOptions): Rect[] {
  const canvasW = opts.canvasW;
  const canvasH = opts.canvasH;

  const sideMargin = opts.sideMargin ?? Math.round(canvasW * 0.06);
  const topMargin = opts.topMargin ?? Math.round(canvasH * 0.08);
  const bottomReserved = opts.bottomReserved ?? Math.round(canvasH * 0.10);

  const colGap = opts.colGap ?? Math.round(canvasW * 0.04);
  const rowGap = opts.rowGap ?? Math.round(canvasH * 0.04);

  const aspectW = opts.aspectW ?? 3;
  const aspectH = opts.aspectH ?? 4;

  // Usable area for the 2x2 grid
  const usableW = canvasW - sideMargin * 2;
  const usableH = canvasH - topMargin - bottomReserved;

  // Each cell size (2 cols, 2 rows)
  const cellW = (usableW - colGap) / 2;
  const cellH = (usableH - rowGap) / 2;

  // Fit target aspect into each cell
  const targetRatio = aspectW / aspectH;
  const cellRatio = cellW / cellH;

  let shotW: number, shotH: number;
  if (cellRatio > targetRatio) {
    // cell wider -> limit by height
    shotH = cellH;
    shotW = shotH * targetRatio;
  } else {
    // cell taller -> limit by width
    shotW = cellW;
    shotH = shotW / targetRatio;
  }

  // Center the grid horizontally inside usableW
  const totalGridW = shotW * 2 + colGap;
  const startX = sideMargin + (usableW - totalGridW) / 2;

  // Start Y at topMargin (already reserved)
  const y1 = topMargin;
  const y2 = y1 + shotH + rowGap;

  const x1 = startX;
  const x2 = x1 + shotW + colGap;

  return [
    { x: x1, y: y1, w: shotW, h: shotH }, // top-left
    { x: x2, y: y1, w: shotW, h: shotH }, // top-right
    { x: x1, y: y2, w: shotW, h: shotH }, // bottom-left
    { x: x2, y: y2, w: shotW, h: shotH }, // bottom-right
  ];
}
