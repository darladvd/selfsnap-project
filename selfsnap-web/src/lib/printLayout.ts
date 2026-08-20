export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Compute 3 vertically-stacked photo slots for a 2x6 print strip.
 * Strip dimensions: 1200 x 3600 px (600dpi).
 *
 * Measurements taken from aws-print-preview.png (inches):
 * - Each slot: 1.5 wide x 1.72 tall
 * - Horizontally centered: x = 0.25 (leaves 0.25 on each side of the 2in strip)
 * - Slot Y offsets: 0.53, 2.32, 4.08
 */
const SLOT_W_IN = 1.5;
const SLOT_H_IN = 1.72;
const SLOT_X_IN = 0.25;
const SLOT_Y_IN = [0.53, 2.32, 4.08];

export function computePrintStripSlots(stripW: number, _stripH: number): Rect[] {
  // Strip is 2 inches wide, so DPI is derived from the pixel width
  const DPI = stripW / 2;

  const w = Math.round(SLOT_W_IN * DPI);
  const h = Math.round(SLOT_H_IN * DPI);
  const x = Math.round(SLOT_X_IN * DPI);

  return SLOT_Y_IN.map((yIn) => ({
    x,
    y: Math.round(yIn * DPI),
    w,
    h,
  }));
}
