export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Compute 3 vertically-stacked photo slots for a 2x6 print strip.
 * Strip dimensions: 1200 x 3600 px (600dpi).
 *
 * Measurements taken from aws-print-preview.png (inches):
 * - Each slot: 1.5 wide x 1.72 tall
 * - Horizontally centered: x = 0.25 (leaves 0.25 on each side of the 2in strip)
 * - First slot starts at y = 0.53
 * - Equal gap of 0.07in between each slot
 */
const SLOT_W_IN = 1.5;
const SLOT_H_IN = 1.72;
const SLOT_X_IN = 0.25;
const SLOT_Y_START = 0.53;
const SLOT_GAP_IN = 0.07;

export function computePrintStripSlots(stripW: number, _stripH: number): Rect[] {
  const DPI = stripW / 2;

  const w = Math.round(SLOT_W_IN * DPI);
  const h = Math.round(SLOT_H_IN * DPI);
  const x = Math.round(SLOT_X_IN * DPI);
  const gap = Math.round(SLOT_GAP_IN * DPI);
  const startY = Math.round(SLOT_Y_START * DPI);

  return [0, 1, 2].map((i) => ({
    x,
    y: startY + i * (h + gap),
    w,
    h,
  }));
}
