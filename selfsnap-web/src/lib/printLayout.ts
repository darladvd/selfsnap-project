export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Compute 3 vertically-stacked photo slots for a 2x6 print strip.
 * Strip dimensions: 1200 x 3600 px (600dpi).
 *
 * Layout (inches, based on aws-print-preview.png):
 * - Each slot: 1.4 wide x 1.5 tall
 * - Horizontally centered: 0.3 margin each side of the 2in strip
 * - Equal 0.07 gap between slots
 * - The whole stack is vertically centered, leaving ~0.68 clear at the top for
 *   the logo and the same at the bottom.
 *
 * Slots are kept deliberately small so borderless-print overscan (typically
 * 0.05-0.1in per edge on 4x6) can never clip a photo.
 */
const SLOT_W_IN = 1.4;
const SLOT_H_IN = 1.5;
const SLOT_GAP_IN = 0.07;

export function computePrintStripSlots(stripW: number, stripH: number): Rect[] {
  // Strip is 2 inches wide, so DPI is derived from the pixel width
  const DPI = stripW / 2;

  const w = Math.round(SLOT_W_IN * DPI);
  const h = Math.round(SLOT_H_IN * DPI);
  const gap = Math.round(SLOT_GAP_IN * DPI);

  const x = Math.round((stripW - w) / 2);

  // Center the 3-slot stack vertically so top and bottom margins match
  const stackH = h * 3 + gap * 2;
  const startY = Math.round((stripH - stackH) / 2);

  return [0, 1, 2].map((i) => ({
    x,
    y: startY + i * (h + gap),
    w,
    h,
  }));
}
