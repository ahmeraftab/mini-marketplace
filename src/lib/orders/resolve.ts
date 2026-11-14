import "server-only";
import { z } from "zod";
import { configurationKey } from "@/lib/cart/key";
import { getProductsByIds } from "@/lib/catalog/queries";
import { imagesForColour } from "@/lib/catalog/types";
import { MAX_QUANTITY, priceConfiguration } from "@/lib/pricing";

/** What the browser sends for each basket line: identifiers only, never prices. */
export const basketLineInput = z.object({
  productId: z.uuid(),
  colourId: z.uuid(),
  valueIds: z.record(z.uuid(), z.uuid()),
  addonIds: z.array(z.uuid()).max(20),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});
export type BasketLineInput = z.infer<typeof basketLineInput>;

export const basketInput = z.array(basketLineInput).max(50);

export type ResolvedLine =
  | {
      ok: true;
      key: string;
      productId: string;
      sellerId: string;
      slug: string;
      title: string;
      colourName: string;
      colourHex: string;
      imagePath: string | null;
      shopName: string;
      options: Array<{ group: string; value: string; deltaPence: number }>;
      addons: Array<{ label: string; pricePence: number }>;
      quantity: number;
      unitPence: number;
      wasUnitPence: number | null;
      lineTotalPence: number;
    }
  | { ok: false; key: string; reason: string };

const keyOf = (l: BasketLineInput) =>
  configurationKey({ productId: l.productId, colourId: l.colourId, valueIds: Object.values(l.valueIds), addonIds: l.addonIds });

/**
 * Rebuilds every basket line from the database. A line comes back `ok: false`
 * when its product is no longer public or any chosen colour / option / add-on
 * no longer exists. Prices always come from `priceConfiguration`.
 */
export async function resolveBasket(lines: BasketLineInput[]): Promise<ResolvedLine[]> {
  const products = await getProductsByIds(lines.map((l) => l.productId));
  const byId = new Map(products.map((p) => [p.id, p]));

  return lines.map((line): ResolvedLine => {
    const key = keyOf(line);
    const product = byId.get(line.productId);
    if (!product || product.status !== "approved" || product.sellerStatus !== "approved") {
      return { ok: false, key, reason: "This bed is no longer available." };
    }
    const colour = product.colours.find((c) => c.id === line.colourId);
    if (!colour) return { ok: false, key, reason: "That colour is no longer offered." };

    // exactly one value per group, and no stray group ids
    const groupIds = new Set(product.groups.map((g) => g.id));
    if (Object.keys(line.valueIds).some((id) => !groupIds.has(id))) {
      return { ok: false, key, reason: "The options for this bed have changed." };
    }
    const price = priceConfiguration(product, { valueIds: line.valueIds, addonIds: line.addonIds, quantity: line.quantity });
    if (!price.ok) return { ok: false, key, reason: "The options for this bed have changed. Please choose it again." };

    const options = product.groups.map((g) => {
      const v = g.values.find((x) => x.id === line.valueIds[g.id])!;
      return { group: g.name, value: v.label, deltaPence: v.priceDeltaPence };
    });
    const ticked = new Set(line.addonIds);
    const addons = product.addons.filter((a) => ticked.has(a.id)).map((a) => ({ label: a.label, pricePence: a.pricePence }));

    return {
      ok: true,
      key,
      productId: product.id,
      sellerId: product.sellerId,
      slug: product.slug,
      title: colour.title,
      colourName: colour.name,
      colourHex: colour.hex,
      imagePath: imagesForColour(product.images, colour.id)[0]?.path ?? null,
      shopName: product.shopName,
      options,
      addons,
      quantity: price.quantity,
      unitPence: price.unitPence,
      wasUnitPence: price.wasUnitPence,
      lineTotalPence: price.lineTotalPence,
    };
  });
}
