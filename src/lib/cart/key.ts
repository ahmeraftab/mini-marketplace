/**
 * Identity of a basket line. Two lines are "the same bed" only when product,
 * colour, every chosen option value and every ticked add-on match; the order
 * the buyer clicked things in does not matter. A different combination is a
 * separate basket line.
 */
export function configurationKey(input: {
  productId: string;
  colourId: string;
  valueIds: string[];
  addonIds: string[];
}): string {
  const values = [...input.valueIds].sort().join(",");
  const addons = [...new Set(input.addonIds)].sort().join(",");
  return `${input.productId}|${input.colourId}|${values}|${addons}`;
}
