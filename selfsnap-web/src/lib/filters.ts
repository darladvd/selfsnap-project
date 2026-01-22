export type FilterMode = "none" | "bw" | "sepia";

/**
 * Apply filter via CanvasRenderingContext2D filter string.
 * Works in modern browsers.
 */
export function ctxFilter(mode: FilterMode): string {
  switch (mode) {
    case "bw":
      return "grayscale(1)";
    case "sepia":
      return "sepia(1)";
    default:
      return "none";
  }
}
