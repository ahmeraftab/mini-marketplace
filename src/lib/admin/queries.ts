import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminSeller = {
  id: string;
  shopName: string;
  email: string;
  status: "pending" | "approved" | "hidden";
  createdAt: string;
  listingCount: number;
};

export type AdminListing = {
  id: string;
  slug: string;
  title: string;
  shopName: string;
  basePricePence: number;
  status: "draft" | "pending" | "approved" | "hidden";
  imagePath: string | null;
};

const order = { pending: 0, draft: 3, approved: 1, hidden: 2 } as const;

export async function getAdminData(): Promise<{ sellers: AdminSeller[]; listings: AdminListing[] }> {
  const supabase = await createClient();
  const [sellersRes, listingsRes] = await Promise.all([
    supabase.from("sellers").select("id, shop_name, status, created_at, profiles!sellers_id_fkey ( email )").order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, slug, title, base_price_pence, status, seller_id, sellers ( shop_name ), product_images ( storage_path, position )")
      .order("created_at", { ascending: false }),
  ]);
  if (sellersRes.error) throw new Error(`Could not load sellers: ${sellersRes.error.message}`);
  if (listingsRes.error) throw new Error(`Could not load listings: ${listingsRes.error.message}`);

  type L = {
    id: string; slug: string; title: string; base_price_pence: number; status: AdminListing["status"]; seller_id: string;
    sellers: { shop_name: string } | { shop_name: string }[] | null;
    product_images: Array<{ storage_path: string; position: number }> | null;
  };
  const rows = (listingsRes.data ?? []) as unknown as L[];
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.seller_id, (counts.get(r.seller_id) ?? 0) + 1);

  type S = { id: string; shop_name: string; status: AdminSeller["status"]; created_at: string; profiles: { email: string } | { email: string }[] | null };
  const sellers = ((sellersRes.data ?? []) as unknown as S[])
    .map((s): AdminSeller => {
      const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
      return { id: s.id, shopName: s.shop_name, email: p?.email ?? "", status: s.status, createdAt: s.created_at, listingCount: counts.get(s.id) ?? 0 };
    })
    .sort((a, b) => order[a.status] - order[b.status]);

  const listings = rows
    .map((r): AdminListing => {
      const shop = Array.isArray(r.sellers) ? r.sellers[0] : r.sellers;
      const img = [...(r.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
      return { id: r.id, slug: r.slug, title: r.title, shopName: shop?.shop_name ?? "", basePricePence: r.base_price_pence, status: r.status, imagePath: img?.storage_path ?? null };
    })
    .sort((a, b) => order[a.status] - order[b.status]);

  return { sellers, listings };
}
