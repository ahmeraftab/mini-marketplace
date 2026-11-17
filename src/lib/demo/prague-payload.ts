import type { SaveProductPayload } from "@/lib/catalog/payload";
import { PRAGUE, titleForColour } from "./prague";

/**
 * Builds the `save_product` payload for the Prague bed. The seed script and
 * the database tests use this so they exercise the SAME write path a seller's
 * form does. Ids are injected so callers control determinism.
 */
export function buildPraguePayload(opts: {
  sellerId: string;
  categoryId: string;
  newId: () => string;
  productId?: string;
  submit?: boolean;
  /** photos per colour; defaults to 5 (the brief asks for at least 5; 8 colours x 5 = 40, the listing limit) */
  imagesPerColour?: number;
}): SaveProductPayload {
  const productId = opts.productId ?? opts.newId();
  const perColour = opts.imagesPerColour ?? 5;

  const colours = PRAGUE.colours.map((c) => ({
    id: opts.newId(),
    name: c.name,
    hex: c.hex,
    title: titleForColour(c.name),
  }));

  const images = colours.flatMap((colour) =>
    Array.from({ length: perColour }, (_, i) => {
      const id = opts.newId();
      return {
        id,
        colour_id: colour.id,
        storage_path: `${opts.sellerId}/${productId}/${id}.jpg`,
        alt: `${colour.title}, view ${i + 1}`,
        width: 1600,
        height: 1200,
      };
    }),
  );

  const groups = PRAGUE.groups.map((g) => ({
    id: opts.newId(),
    name: g.name,
    is_filterable: g.isFilterable,
    values: g.values.map((v) => ({
      id: opts.newId(),
      label: v.label,
      price_delta_pence: v.deltaPence,
      is_default: g.defaultLabel === v.label,
    })),
  }));

  const addons = PRAGUE.addons.map((a) => ({
    id: opts.newId(),
    label: a.label,
    price_pence: a.pricePence,
  }));

  return {
    id: productId,
    category_id: opts.categoryId,
    description: PRAGUE.description,
    base_price_pence: PRAGUE.basePricePence,
    compare_at_price_pence: PRAGUE.compareAtPricePence,
    submit: opts.submit ?? true,
    colours,
    images,
    groups,
    addons,
  };
}
