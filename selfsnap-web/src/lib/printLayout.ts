export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Compute 3 vertically-stacked photo slots for a 2x6 print strip.
 * Strip dimensions: 1200 x 3600 px (600dpi).
 *
 * Based on frame measurements:
 * - First photo starts at X: 0.33in, Y: 0.38in from top-left
 * - Photos are 3:4 aspect, filling available width with symmetric padding
 * - Small gap between photos, date text at bottom
 */
export function computePrintStripSlots(
  stripW: number,
  _stripH: number
): Rect[] {
  const DPI = stripW / 2; // 600dpi for 2-inch wide strip

  const startX = Math.round(0.33 * DPI);
  const startY = Math.round(0.38 * DPI);

  const photoW = stripW - startX * 2;
  const photoH = Math.round(photoW * 4 / 3);

  const gap = Math.round(0.06 * DPI); // ~36px gap

  return [
    { x: startX, y: startY, w: photoW, h: photoH },
    { x: startX, y: startY + photoH + gap, w: photoW, h: photoH },
    { x: startX, y: startY + (photoH + gap) * 2, w: photoW, h: photoH },
  ];
}
