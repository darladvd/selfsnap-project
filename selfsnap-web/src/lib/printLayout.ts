export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Compute 3 vertically-stacked photo slots for a 2x6 print strip.
 * Strip dimensions: 1200 x 3600 px (600dpi).
 */
export function computePrintStripSlots(
  stripW: number,
  stripH: number
): Rect[] {
  const headerH = Math.round(stripH * 0.11);
  const bottomPad = Math.round(stripH * 0.03);
  const sidePad = Math.round(stripW * 0.10);
  const gap = Math.round(stripH * 0.015);

  const availW = stripW - sidePad * 2;
  const availH = stripH - headerH - bottomPad - gap * 2;

  let photoH = Math.floor(availH / 3);
  let photoW = Math.floor(photoH * 3 / 4);

  if (photoW > availW) {
    photoW = availW;
    photoH = Math.floor(photoW * 4 / 3);
  }

  const leftX = Math.round((stripW - photoW) / 2);

  return [
    { x: leftX, y: headerH, w: photoW, h: photoH },
    { x: leftX, y: headerH + photoH + gap, w: photoW, h: photoH },
    { x: leftX, y: headerH + photoH * 2 + gap * 2, w: photoW, h: photoH },
  ];
}
