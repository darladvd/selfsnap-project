// src/lib/layout.ts
export type Rect = { x: number; y: number; w: number; h: number };

export function compute4GridSlots(
  canvasW: number,
  canvasH: number,
  opts?: {
    outerPad?: number; // padding from edges
    gap?: number; // gap between slots
    ratioW?: number; // default 3
    ratioH?: number; // default 4
    headerH?: number; // reserved top area (logo space)
    footerH?: number; // reserved bottom area (text space)
  }
): Rect[] {
  // ✅ Tighter margins + tighter gaps = bigger slots
  const outerPad = opts?.outerPad ?? Math.round(canvasW * 0.04); // was 0.06
  const gap = opts?.gap ?? Math.round(canvasW * 0.025); // was 0.04
  const ratioW = opts?.ratioW ?? 3;
  const ratioH = opts?.ratioH ?? 4;

  // ✅ Give the grid more room (so slots can grow)
  const headerH = opts?.headerH ?? Math.round(canvasH * 0.06); // was 0.08
  const footerH = opts?.footerH ?? Math.round(canvasH * 0.07); // was 0.10

  const usableW = canvasW - outerPad * 2;
  const usableH = canvasH - outerPad * 2 - headerH - footerH;

  const cellW = (usableW - gap) / 2;
  const cellH = (usableH - gap) / 2;

  // Fit a 3:4 rect inside each cell
  const cellRatio = cellW / cellH;
  const targetRatio = ratioW / ratioH;

  let shotW: number, shotH: number;
  if (cellRatio > targetRatio) {
    shotH = cellH;
    shotW = shotH * targetRatio;
  } else {
    shotW = cellW;
    shotH = shotW / targetRatio;
  }

  const gridLeft = outerPad + (usableW - (shotW * 2 + gap)) / 2;
const gridTop = outerPad + headerH + Math.round(canvasH * 0.006);

  return [
    { x: gridLeft, y: gridTop, w: shotW, h: shotH },
    { x: gridLeft + shotW + gap, y: gridTop, w: shotW, h: shotH },
    { x: gridLeft, y: gridTop + shotH + gap, w: shotW, h: shotH },
    { x: gridLeft + shotW + gap, y: gridTop + shotH + gap, w: shotW, h: shotH },
  ];
}
