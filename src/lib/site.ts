/** Change the marketplace name here and it changes everywhere. */
export const SITE_NAME = "Larch Market";
export const SITE_TAGLINE = "Furniture from independent makers";
export const SITE_DESCRIPTION =
  "A demo multi-vendor marketplace. Sample data only; nothing here is a real shop and no payment is taken.";

export const DEMO_SELLER_SHOP = "Demo Seller";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
