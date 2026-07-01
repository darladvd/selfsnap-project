/**
 * Sample a region of the canvas and return a text color
 * (black or white) that contrasts well against the average background.
 */
export function pickTextColorFromRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const imageData = ctx.getImageData(x, y, w, h);
  const data = imageData.data;

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  const pixelCount = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i]!;
    gSum += data[i + 1]!;
    bSum += data[i + 2]!;
  }

  const rAvg = rSum / pixelCount;
  const gAvg = gSum / pixelCount;
  const bAvg = bSum / pixelCount;

  // Relative luminance (ITU-R BT.709)
  const luminance = 0.2126 * rAvg + 0.7152 * gAvg + 0.0722 * bAvg;

  return luminance > 128 ? "#000000" : "#FFFFFF";
}
