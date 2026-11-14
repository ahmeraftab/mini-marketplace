import "server-only";
import type { BrowseParams } from "./browse";
import { FIXTURES_ENABLED, fixtureCard, fixtureFacets, fixtureProduct } from "./fixtures";
import {
  CARD_SELECT,
  PRODUCT_SELECT,
  mapCard,
  mapFacets,
  mapProduct,
  type CardRow,
  type ProductRow,
} from "./mappers";
import type { Facets, ProductCard, ProductDetail } from "./types";
import { createClient } from "@/lib/supabase/server";

/**
 * Catalog reads. They run as the current visitor, so row-level security
 * decides what is visible (public listings for everyone; a seller's own
 * drafts for that seller; everything for admins).
 */

const chunk = <T>(list: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export async function getFacets(): Promise<Facets> {
  if (FIXTURES_ENABLED()) return fixtureFacets();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("catalog_facets");
  if (error) throw new Error(`Could not load filters: ${error.message}`);
  return mapFacets(data);
}

export async function searchProducts(params: BrowseParams, facets: Facets): Promise<ProductCard[]> {
  const category = params.category ? facets.categories.find((c) => c.slug === params.category) : null;

  if (FIXTURES_ENABLED()) {
    const card = fixtureCard();
    const q = params.q.toLowerCase();
    const matchesQ = !q || [card.title, card.shopName, ...card.colours.map((c) => c.name)].some((t) => t.toLowerCase().includes(q));
    const matchesColour = !params.colours.length || card.colours.some((c) => params.colours.includes(c.name));
    const matchesSize = !params.sizes.length || fixtureFacets().sizes.some((s) => params.sizes.includes(s));
    const matchesPrice =
      (params.minPence == null || card.basePricePence >= params.minPence) &&
      (params.maxPence == null || card.basePricePence <= params.maxPence);
    const matchesCategory = !category || fixtureProduct().category.id === category.id || category.parentId === null;
    return matchesQ && matchesColour && matchesSize && matchesPrice && matchesCategory ? [card] : [];
  }

  // an unknown category slug can match nothing (rather than silently showing everything)
  if (params.category && !category) return [];

  const supabase = await createClient();
  const { data: found, error } = await supabase.rpc("search_products", {
    p_q: params.q || null,
    p_category: category?.id ?? null,
    p_colours: params.colours.length ? params.colours : null,
    p_sizes: params.sizes.length ? params.sizes : null,
    p_min_pence: params.minPence,
    p_max_pence: params.maxPence,
  });
  if (error) throw new Error(`Search failed: ${error.message}`);
  const ids = (found as Array<{ id: string }> | null)?.map((r) => r.id) ?? [];
  if (!ids.length) return [];

  const rows = (
    await Promise.all(
      chunk(ids, 40).map(async (group) => {
        const { data, error: cardError } = await supabase.from("products").select(CARD_SELECT).in("id", group);
        if (cardError) throw new Error(`Could not load listings: ${cardError.message}`);
        return (data ?? []) as unknown as CardRow[];
      }),
    )
  ).flat();

  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map(mapCard);
}

export async function getFeaturedProducts(limit = 4): Promise<ProductCard[]> {
  if (FIXTURES_ENABLED()) return [fixtureCard()];
  const supabase = await createClient();
  const { data: found } = await supabase.rpc("search_products");
  const ids = ((found as Array<{ id: string }> | null) ?? []).slice(0, limit).map((r) => r.id);
  if (!ids.length) return [];
  const { data } = await supabase.from("products").select(CARD_SELECT).in("id", ids);
  const rows = (data ?? []) as unknown as CardRow[];
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map(mapCard);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  if (FIXTURES_ENABLED()) {
    const p = fixtureProduct();
    return p.slug === slug ? p : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Could not load the product: ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export async function getProductById(id: string): Promise<ProductDetail | null> {
  if (FIXTURES_ENABLED()) {
    const p = fixtureProduct();
    return p.id === id ? p : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the product: ${error.message}`);
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

/** Full listings for a set of ids (basket validation, checkout). Non-public ones simply do not come back. */
export async function getProductsByIds(ids: string[]): Promise<ProductDetail[]> {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  if (FIXTURES_ENABLED()) {
    const p = fixtureProduct();
    return unique.includes(p.id) ? [p] : [];
  }
  const supabase = await createClient();
  const rows = (
    await Promise.all(
      chunk(unique, 20).map(async (group) => {
        const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).in("id", group);
        if (error) throw new Error(`Could not load products: ${error.message}`);
        return (data ?? []) as unknown as ProductRow[];
      }),
    )
  ).flat();
  return rows.map(mapProduct);
}

/** The signed-in seller's own listings (any status). RLS limits rows to the owner. */
export async function getSellerListings(sellerId: string): Promise<Array<ProductCard & { status: string }>> {
  if (FIXTURES_ENABLED()) return [{ ...fixtureCard(), status: "approved" }];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(`${CARD_SELECT}, status`)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load your listings: ${error.message}`);
  return ((data ?? []) as unknown as Array<CardRow & { status: string }>).map((row) => ({
    ...mapCard(row),
    status: row.status,
  }));
}

/** Every category (the seller form's picker), parents first. */
export async function getAllCategories(): Promise<Facets["categories"]> {
  if (FIXTURES_ENABLED()) return fixtureFacets().categories;
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name, slug, parent_id, position").order("position");
  if (error) throw new Error(`Could not load categories: ${error.message}`);
  return ((data ?? []) as Array<{ id: string; name: string; slug: string; parent_id: string | null }>).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    parentId: c.parent_id,
  }));
}
