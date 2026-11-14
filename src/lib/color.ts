/** Relative luminance of a #rrggbb colour, 0 (black) to 1 (white). Decides tick colour on a swatch. */
export function luminanceOf(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return 1;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
