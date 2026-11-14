import type { PricingProduct } from "@/lib/pricing";

export type ListingStatus = "draft" | "pending" | "approved" | "hidden";
export type SellerStatus = "pending" | "approved" | "hidden";

export type Colour = { id: string; name: string; hex: string; title: string; position: number };

export type ProductImage = {
  id: string;
  colourId: string | null; // null = shared by every colour
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
  position: number;
};

export type OptionValue = {
  id: string;
  label: string;
  priceDeltaPence: number;
  isDefault: boolean;
  position: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  isFilterable: boolean;
  position: number;
  values: OptionValue[];
};

export type Addon = { id: string; label: string; pricePence: number; position: number };

/** Everything the product page and the seller form need. Structurally a PricingProduct. */
export type ProductDetail = PricingProduct & {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: ListingStatus;
  createdAt: string;
  sellerId: string;
  shopName: string;
  sellerStatus: SellerStatus;
  category: { id: string; name: string; slug: string; parentId: string | null };
  colours: Colour[];
  images: ProductImage[];
  groups: OptionGroup[];
  addons: Addon[];
};

/** A listing card: enough to draw the grid without loading options. */
export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  basePricePence: number;
  compareAtPricePence: number | null;
  shopName: string;
  colours: Array<{ id: string; name: string; hex: string; title: string }>;
  images: Array<{ colourId: string | null; path: string; alt: string }>;
};

export type Facets = {
  categories: Array<{ id: string; name: string; slug: string; parentId: string | null }>;
  colours: Array<{ name: string; hex: string }>;
  sizes: string[];
  minPence: number | null;
  maxPence: number | null;
};

/** Images that belong on the gallery for one colour: its own first, then shared ones. */
export function imagesForColour(images: ProductImage[], colourId: string): ProductImage[] {
  const own = images.filter((i) => i.colourId === colourId);
  const shared = images.filter((i) => i.colourId === null);
  return [...own, ...shared];
}
