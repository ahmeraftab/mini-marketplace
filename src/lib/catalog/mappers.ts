import type { Facets, ListingStatus, ProductCard, ProductDetail, SellerStatus } from "./types";

/** Raw rows exactly as PostgREST returns them (snake_case, unordered children). */
export type ProductRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  base_price_pence: number;
  compare_at_price_pence: number | null;
  status: ListingStatus;
  seller_id: string;
  category_id: string;
  created_at: string;
  sellers: { shop_name: string; status: SellerStatus } | null;
  categories: { id: string; name: string; slug: string; parent_id: string | null } | null;
  product_colours: Array<{ id: string; name: string; hex: string; title: string; position: number }>;
  product_images: Array<{
    id: string;
    colour_id: string | null;
    storage_path: string;
    alt: string;
    width: number | null;
    height: number | null;
    position: number;
  }>;
  option_groups: Array<{
    id: string;
    name: string;
    position: number;
    is_filterable: boolean;
    option_values: Array<{
      id: string;
      label: string;
      price_delta_pence: number;
      position: number;
      is_default: boolean;
    }>;
  }>;
  product_addons: Array<{ id: string; label: string; price_pence: number; position: number }>;
};

export const PRODUCT_SELECT = `
  id, slug, title, description, base_price_pence, compare_at_price_pence, status, seller_id, category_id, created_at,
  sellers ( shop_name, status ),
  categories ( id, name, slug, parent_id ),
  product_colours ( id, name, hex, title, position ),
  product_images ( id, colour_id, storage_path, alt, width, height, position ),
  option_groups ( id, name, position, is_filterable, option_values ( id, label, price_delta_pence, position, is_default ) ),
  product_addons ( id, label, price_pence, position )
`;

export type CardRow = {
  id: string;
  slug: string;
  title: string;
  base_price_pence: number;
  compare_at_price_pence: number | null;
  created_at: string;
  sellers: { shop_name: string } | null;
  product_colours: Array<{ id: string; name: string; hex: string; title: string; position: number }>;
  product_images: Array<{ colour_id: string | null; storage_path: string; alt: string; position: number }>;
};

export const CARD_SELECT = `
  id, slug, title, base_price_pence, compare_at_price_pence, created_at,
  sellers ( shop_name ),
  product_colours ( id, name, hex, title, position ),
  product_images ( colour_id, storage_path, alt, position )
`;

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** PostgREST returns embedded rows in no guaranteed order: always sort by `position`. */
export function mapProduct(row: ProductRow): ProductDetail {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    status: row.status,
    createdAt: row.created_at,
    basePricePence: row.base_price_pence,
    compareAtPricePence: row.compare_at_price_pence,
    sellerId: row.seller_id,
    shopName: row.sellers?.shop_name ?? "Independent seller",
    sellerStatus: row.sellers?.status ?? "pending",
    category: {
      id: row.categories?.id ?? row.category_id,
      name: row.categories?.name ?? "Uncategorised",
      slug: row.categories?.slug ?? "",
      parentId: row.categories?.parent_id ?? null,
    },
    colours: [...row.product_colours].sort(byPosition).map((c) => ({ ...c })),
    images: [...row.product_images].sort(byPosition).map((i) => ({
      id: i.id,
      colourId: i.colour_id,
      path: i.storage_path,
      alt: i.alt,
      width: i.width,
      height: i.height,
      position: i.position,
    })),
    groups: [...row.option_groups].sort(byPosition).map((g) => ({
      id: g.id,
      name: g.name,
      isFilterable: g.is_filterable,
      position: g.position,
      values: [...g.option_values].sort(byPosition).map((v) => ({
        id: v.id,
        label: v.label,
        priceDeltaPence: v.price_delta_pence,
        isDefault: v.is_default,
        position: v.position,
      })),
    })),
    addons: [...row.product_addons].sort(byPosition).map((a) => ({
      id: a.id,
      label: a.label,
      pricePence: a.price_pence,
      position: a.position,
    })),
  };
}

export function mapCard(row: CardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    basePricePence: row.base_price_pence,
    compareAtPricePence: row.compare_at_price_pence,
    shopName: row.sellers?.shop_name ?? "Independent seller",
    colours: [...row.product_colours].sort(byPosition).map((c) => ({
      id: c.id,
      name: c.name,
      hex: c.hex,
      title: c.title,
    })),
    images: [...row.product_images]
      .sort(byPosition)
      .map((i) => ({ colourId: i.colour_id, path: i.storage_path, alt: i.alt })),
  };
}

export function mapFacets(raw: unknown): Facets {
  const f = (raw ?? {}) as {
    categories?: Array<{ id: string; name: string; slug: string; parent_id: string | null }>;
    colours?: Array<{ name: string; hex: string }>;
    sizes?: string[];
    min_pence?: number | null;
    max_pence?: number | null;
  };
  return {
    categories: (f.categories ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent_id })),
    colours: f.colours ?? [],
    sizes: f.sizes ?? [],
    minPence: f.min_pence ?? null,
    maxPence: f.max_pence ?? null,
  };
}
