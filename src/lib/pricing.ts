/**
 * THE ONLY PLACE PRICES ARE CALCULATED.
 *
 * The product page calls this on every option change; the checkout server
 * action calls it again on data it has just read from the database. To change
 * a price rule (for example "assembly is free on King and above") edit this
 * file and tests/unit/pricing.test.ts, nowhere else.
 *
 * Pure, no I/O, integer pence only.
 */

export const MAX_QUANTITY = 10;

export type PricingValue = {
  id: string;
  label: string;
  priceDeltaPence: number;
};

export type PricingGroup = {
  id: string;
  name: string;
  values: PricingValue[];
};

export type PricingAddon = {
  id: string;
  label: string;
  pricePence: number;
};

export type PricingProduct = {
  basePricePence: number;
  compareAtPricePence: number | null;
  groups: PricingGroup[];
  addons: PricingAddon[];
};

export type Selection = {
  /** groupId -> chosen value id (missing / null / undefined = not chosen yet) */
  valueIds: Record<string, string | null | undefined>;
  addonIds: string[];
  quantity: number;
};

export type BreakdownRow = {
  kind: "base" | "option" | "addon";
  label: string;
  /** Group name for option rows, e.g. "Size". */
  group?: string;
  pence: number;
};

export type PriceResult = {
  /** Every option group has a valid chosen value and every add-on id exists. */
  ok: boolean;
  missingGroupIds: string[];
  /** Add-on ids that do not belong to this product. */
  unknownAddonIds: string[];
  /** Base + chosen option extras + ticked add-ons, for ONE bed. */
  unitPence: number;
  /** Compare-at + the same extras (so it never falls below unitPence). */
  wasUnitPence: number | null;
  /** compare-at - base: the listing's headline saving. */
  savingPence: number | null;
  /** round((1 - base / compare-at) * 100): the "50% OFF" badge. */
  discountPercent: number | null;
  quantity: number;
  lineTotalPence: number;
  breakdown: BreakdownRow[];
};

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.trunc(quantity)));
}

/**
 * The compare-at ("was") price that gives a whole-number percentage off the
 * base price, so a seller can type "50" instead of working out £539.98.
 * Returns null for anything outside 1 to 95 per cent. The badge is still
 * calculated from the two stored prices (discountPercentFor), so it always
 * matches what the buyer is charged.
 */
export function compareAtForPercent(basePricePence: number, percentOff: number): number | null {
  if (!Number.isInteger(basePricePence) || basePricePence <= 0) return null;
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 95) return null;
  return Math.round((basePricePence * 100) / (100 - percentOff));
}

/** Headline discount for a listing, or null when there is no compare-at price. */
export function discountPercentFor(
  basePricePence: number,
  compareAtPricePence: number | null,
): number | null {
  if (compareAtPricePence == null || compareAtPricePence <= basePricePence) {
    return null;
  }
  return Math.round(
    ((compareAtPricePence - basePricePence) * 100) / compareAtPricePence,
  );
}

export function priceConfiguration(
  product: PricingProduct,
  selection: Selection,
): PriceResult {
  const breakdown: BreakdownRow[] = [
    { kind: "base", label: "Base price", pence: product.basePricePence },
  ];
  const missingGroupIds: string[] = [];
  let extras = 0;

  for (const group of product.groups) {
    const chosenId = selection.valueIds[group.id];
    const value = chosenId
      ? group.values.find((v) => v.id === chosenId)
      : undefined;
    if (!value) {
      missingGroupIds.push(group.id);
      continue;
    }
    extras += value.priceDeltaPence;
    breakdown.push({
      kind: "option",
      group: group.name,
      label: value.label,
      pence: value.priceDeltaPence,
    });
  }

  const unknownAddonIds: string[] = [];
  const seenAddons = new Set<string>();
  for (const addonId of selection.addonIds) {
    if (seenAddons.has(addonId)) continue; // a tick box can only be ticked once
    seenAddons.add(addonId);
    const addon = product.addons.find((a) => a.id === addonId);
    if (!addon) {
      unknownAddonIds.push(addonId);
      continue;
    }
    extras += addon.pricePence;
    breakdown.push({ kind: "addon", label: addon.label, pence: addon.pricePence });
  }

  const quantity = clampQuantity(selection.quantity);
  const unitPence = product.basePricePence + extras;
  const compareAt = product.compareAtPricePence;
  const hasCompare = compareAt != null && compareAt > product.basePricePence;

  return {
    ok: missingGroupIds.length === 0 && unknownAddonIds.length === 0,
    missingGroupIds,
    unknownAddonIds,
    unitPence,
    wasUnitPence: hasCompare ? compareAt + extras : null,
    savingPence: hasCompare ? compareAt - product.basePricePence : null,
    discountPercent: discountPercentFor(product.basePricePence, compareAt),
    quantity,
    lineTotalPence: unitPence * quantity,
    breakdown,
  };
}
