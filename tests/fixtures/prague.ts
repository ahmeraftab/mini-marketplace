import { PRAGUE } from "../../src/lib/demo/prague";
import type { PricingProduct, Selection } from "../../src/lib/pricing";

/** Builds the Prague bed as a PricingProduct with readable, deterministic ids. */
export function buildPragueForPricing(): PricingProduct {
  return {
    basePricePence: PRAGUE.basePricePence,
    compareAtPricePence: PRAGUE.compareAtPricePence,
    groups: PRAGUE.groups.map((g) => ({
      id: `g:${g.name}`,
      name: g.name,
      values: g.values.map((v) => ({
        id: `v:${g.name}:${v.label}`,
        label: v.label,
        priceDeltaPence: v.deltaPence,
      })),
    })),
    addons: PRAGUE.addons.map((a) => ({
      id: `a:${a.label}`,
      label: a.label,
      pricePence: a.pricePence,
    })),
  };
}

export function pick(
  choices: Partial<Record<"Size" | "Storage" | "Headboard" | "Base", string>>,
  opts: { assembly?: boolean; quantity?: number } = {},
): Selection {
  const valueIds: Record<string, string> = {};
  for (const [group, label] of Object.entries(choices)) {
    valueIds[`g:${group}`] = `v:${group}:${label}`;
  }
  return {
    valueIds,
    addonIds: opts.assembly ? ["a:Professional Assembly"] : [],
    quantity: opts.quantity ?? 1,
  };
}
