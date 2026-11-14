import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Role = "buyer" | "seller" | "admin";

export type SessionProfile = {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  seller: { shopName: string; status: "pending" | "approved" | "hidden" } | null;
};

/**
 * The signed-in user and their role, or null. The identity comes from
 * `getClaims()` (the token is verified), never from the unverified cookie.
 * Cached per request so layouts and pages can all call it cheaply.
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  let seller: SessionProfile["seller"] = null;
  if (profile.role === "seller") {
    const { data: row } = await supabase
      .from("sellers")
      .select("shop_name, status")
      .eq("id", userId)
      .maybeSingle();
    if (row) seller = { shopName: row.shop_name, status: row.status };
  }

  return {
    id: profile.id,
    role: profile.role as Role,
    fullName: profile.full_name ?? "",
    email: profile.email ?? "",
    seller,
  };
});

export function homeFor(role: Role): string {
  if (role === "seller") return "/seller";
  if (role === "admin") return "/admin";
  return "/";
}
