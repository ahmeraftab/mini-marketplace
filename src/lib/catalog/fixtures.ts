import { PRAGUE, titleForColour } from "@/lib/demo/prague";
import { slugify } from "@/lib/format";
import type { Facets, ProductCard, ProductDetail } from "./types";

/**
 * DEVELOPMENT-ONLY preview data (MM_FIXTURES=1, never in production). It lets
 * the UI be built and screenshotted before a database is connected. The real
 * app reads everything from Supabase; see queries.ts.
 */

function fixtureId(seed: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  const a = hex(h1) + hex(h2) + hex(h1 ^ h2) + hex(Math.imul(h1, 31) ^ h2);
  return `${a.slice(0, 8)}-${a.slice(8, 12)}-4${a.slice(13, 16)}-8${a.slice(17, 20)}-${a.slice(20, 32)}`;
}

export const FIXTURES_ENABLED = () =>
  process.env.MM_FIXTURES === "1" && process.env.NODE_ENV !== "production";

const SELLER_ID = fixtureId("seller");
const CATEGORY = {
  id: fixtureId("category:divan-beds"),
  name: PRAGUE.category.child,
  slug: "divan-beds",
  parentId: fixtureId("category:furniture"),
};

export function fixtureProduct(): ProductDetail {
  const colours = PRAGUE.colours.map((c, i) => ({
    id: fixtureId(`colour:${c.name}`),
    name: c.name,
    hex: c.hex,
    title: titleForColour(c.name),
    position: i,
  }));

  const images = colours.flatMap((colour) =>
    Array.from({ length: 6 }, (_, n) => ({
      id: fixtureId(`image:${colour.name}:${n}`),
      colourId: colour.id,
      path: `/seed/${slugify(colour.name)}/${n + 1}.jpg`,
      alt: `${colour.title}, view ${n + 1}`,
      width: 1600,
      height: 1200,
      position: n,
    })),
  );

  return {
    id: fixtureId("product"),
    slug: slugify(PRAGUE.title),
    title: PRAGUE.title,
    description: PRAGUE.description,
    status: "approved",
    createdAt: "2026-11-01T09:00:00Z",
    basePricePence: PRAGUE.basePricePence,
    compareAtPricePence: PRAGUE.compareAtPricePence,
    sellerId: SELLER_ID,
    shopName: "Demo Seller",
    sellerStatus: "approved",
    category: CATEGORY,
    colours,
    images,
    groups: PRAGUE.groups.map((g, gi) => ({
      id: fixtureId(`group:${g.name}`),
      name: g.name,
      isFilterable: g.isFilterable,
      position: gi,
      values: g.values.map((v, vi) => ({
        id: fixtureId(`value:${g.name}:${v.label}`),
        label: v.label,
        priceDeltaPence: v.deltaPence,
        isDefault: g.defaultLabel === v.label,
        position: vi,
      })),
    })),
    addons: PRAGUE.addons.map((a, ai) => ({
      id: fixtureId(`addon:${a.label}`),
      label: a.label,
      pricePence: a.pricePence,
      position: ai,
    })),
  };
}

export function fixtureCard(): ProductCard {
  const p = fixtureProduct();
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    basePricePence: p.basePricePence,
    compareAtPricePence: p.compareAtPricePence,
    shopName: p.shopName,
    colours: p.colours.map(({ id, name, hex, title }) => ({ id, name, hex, title })),
    images: p.images.map((i) => ({ colourId: i.colourId, path: i.path, alt: i.alt })),
  };
}

export function fixtureFacets(): Facets {
  const p = fixtureProduct();
  return {
    categories: [
      { id: CATEGORY.parentId, name: PRAGUE.category.parent, slug: "furniture", parentId: null },
      CATEGORY,
    ],
    colours: p.colours.map((c) => ({ name: c.name, hex: c.hex })).sort((a, b) => a.name.localeCompare(b.name)),
    sizes: p.groups[0].values.map((v) => v.label),
    minPence: p.basePricePence,
    maxPence: p.basePricePence,
  };
}
