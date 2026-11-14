"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, parseDbError, succeed, type ActionResult } from "@/lib/action-result";
import { createClient } from "@/lib/supabase/server";

const sellerSchema = z.object({ id: z.uuid(), status: z.enum(["pending", "approved", "hidden"]) });
const listingSchema = z.object({ id: z.uuid(), status: z.enum(["draft", "pending", "approved", "hidden"]) });

/** The database functions check is_admin() themselves; the session check here is only for a friendlier message. */
export async function setSellerStatus(raw: unknown): Promise<ActionResult> {
  const parsed = sellerSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "That change is not valid.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_seller_status", { p_seller_id: parsed.data.id, p_status: parsed.data.status });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath("/");
  return succeed(undefined);
}

export async function setListingStatus(raw: unknown): Promise<ActionResult> {
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "That change is not valid.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_listing_status", { p_product_id: parsed.data.id, p_status: parsed.data.status });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  revalidatePath("/admin");
  revalidatePath("/products");
  revalidatePath("/");
  return succeed(undefined);
}
