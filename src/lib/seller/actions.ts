"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, parseDbError, succeed, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { getSessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveProductSchema } from "./payload-schema";

/**
 * Create or update a listing. The caller's identity comes from the verified
 * session (the database function reads it again from the token); the payload
 * is validated here and again by the database.
 */
export async function saveProduct(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSessionProfile();
  if (!session) return fail("NOT_SIGNED_IN", "Please sign in again.");
  if (session.role !== "seller") return fail("FORBIDDEN", "Only seller accounts can save listings.");

  const parsed = saveProductSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION", "Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const payload = parsed.data;
  // every photo must live in this seller's own folder (the database checks too)
  if (payload.images.some((i) => !i.storage_path.startsWith(`${session.id}/`))) {
    return fail("FORBIDDEN", "One of the photos does not belong to your shop.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_product", { p_payload: payload });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  revalidatePath("/seller");
  revalidatePath("/products");
  return succeed({ id: String(data) });
}

export async function deleteProduct(id: unknown): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return fail("VALIDATION", "That listing could not be found.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_product", { p_id: parsed.data });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  revalidatePath("/seller");
  revalidatePath("/products");
  return succeed(undefined);
}
