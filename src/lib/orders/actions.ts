"use server";

import { z } from "zod";
import { fail, parseDbError, succeed, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { getSessionProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { basketInput, resolveBasket, type ResolvedLine } from "./resolve";

/** Re-reads the basket from the database so the cart page shows live prices and availability. */
export async function refreshBasket(raw: unknown): Promise<ActionResult<ResolvedLine[]>> {
  const parsed = basketInput.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "Your basket could not be read. Please reload the page.");
  try {
    return succeed(await resolveBasket(parsed.data));
  } catch {
    return fail("UNKNOWN", "We could not check your basket just now. Please try again.");
  }
}

const trimmed = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} is too long`);

const shippingSchema = z.object({
  name: trimmed("Full name", 2, 100),
  phone: trimmed("Phone number", 6, 30).regex(/^[0-9+()\-\s.]+$/, "Use digits, spaces and + ( ) - only"),
  line1: trimmed("Address", 3, 120),
  line2: z.string().trim().max(120, "Address line 2 is too long").default(""),
  city: trimmed("Town or city", 2, 80),
  postcode: trimmed("Postcode", 3, 12),
});

const placeOrderSchema = z.object({
  checkoutId: z.uuid(),
  lines: basketInput.min(1, "Your basket is empty"),
  /** The total the buyer saw; if the server's total differs, nothing is charged or ordered. */
  displayedTotalPence: z.number().int().min(0),
  shipping: shippingSchema,
});

export type PlacedOrder = { id: string; orderNumber: string };

export async function placeOrder(raw: unknown): Promise<ActionResult<{ orders: PlacedOrder[]; keys: string[] }> & { fresh?: ResolvedLine[] }> {
  const session = await getSessionProfile();
  if (!session) return fail("NOT_SIGNED_IN", "Please sign in to place your order.");
  if (session.role !== "buyer") return fail("FORBIDDEN", "Sign in with a buyer account to place orders.");

  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error.issues);
    const shippingErrors = Object.fromEntries(
      Object.entries(fieldErrors).filter(([k]) => k.startsWith("shipping.")).map(([k, v]) => [k.slice(9), v]),
    );
    return fail("VALIDATION", fieldErrors.lines ?? "Please check the highlighted fields.", shippingErrors);
  }
  const { checkoutId, lines, displayedTotalPence, shipping } = parsed.data;

  let resolved: ResolvedLine[];
  try {
    resolved = await resolveBasket(lines);
  } catch {
    return fail("UNKNOWN", "We could not check your basket just now. Please try again.");
  }

  const gone = resolved.filter((l) => !l.ok);
  if (gone.length) {
    return { ...fail("ITEM_UNAVAILABLE", "Some items in your basket are no longer available. Remove them to continue."), fresh: resolved };
  }
  const ok = resolved.filter((l): l is Extract<ResolvedLine, { ok: true }> => l.ok);
  const total = ok.reduce((n, l) => n + l.lineTotalPence, 0);
  if (total !== displayedTotalPence) {
    return {
      ...fail("PRICE_CHANGED", `Prices have changed. Your total is now £${(total / 100).toFixed(2)}. Please review your basket.`),
      fresh: resolved,
    };
  }

  // the identity comes from the verified session, never from the request
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_orders", {
    p_buyer_id: session.id,
    p_payload: {
      checkout_id: checkoutId,
      shipping,
      lines: ok.map((l) => ({
        product_id: l.productId,
        seller_id: l.sellerId,
        title: l.title,
        colour_name: l.colourName,
        colour_hex: l.colourHex,
        image_path: l.imagePath,
        options: l.options.map((o) => ({ group: o.group, value: o.value, price_delta_pence: o.deltaPence })),
        addons: l.addons.map((a) => ({ label: a.label, price_pence: a.pricePence })),
        unit_price_pence: l.unitPence,
        quantity: l.quantity,
        line_total_pence: l.lineTotalPence,
      })),
    },
  });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  const orders = ((data as Array<{ id: string; order_number: string }>) ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
  }));
  return succeed({ orders, keys: ok.map((l) => l.key) });
}

const statusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum(["new", "confirmed", "shipped", "delivered"]),
});

/** Seller (or admin) moves an order along. The database function checks who is calling. */
export async function setOrderStatus(raw: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return fail("VALIDATION", "That status is not valid.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
  });
  if (error) {
    const e = parseDbError(error);
    return fail(e.code, e.message);
  }
  return succeed(undefined);
}
