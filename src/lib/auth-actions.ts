"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { homeFor, type Role } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

const signUpSchema = z
  .object({
    role: z.enum(["buyer", "seller"]),
    fullName: z.string().trim().min(2, "Enter your name").max(80, "That name is too long"),
    shopName: z.string().trim().max(80, "That shop name is too long").optional(),
    email: emailSchema,
    password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
  })
  .refine((v) => v.role !== "seller" || (v.shopName && v.shopName.length >= 2), {
    path: ["shopName"],
    message: "Enter a shop name",
  });

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password do not match.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("email not confirmed")) return "Please confirm your email address first.";
  if (m.includes("password")) return "That password is not accepted. Try a longer one.";
  return "We could not complete that. Please try again.";
}

export async function signInAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED", "The backend is not configured yet.");
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return fail("AUTH", friendlyAuthError(error?.message ?? ""));

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  const role = (profile?.role ?? "buyer") as Role;
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, homeFor(role)));
}

export async function signUpAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return fail("NOT_CONFIGURED", "The backend is not configured yet.");
  const parsed = signUpSchema.safeParse({
    role: formData.get("role"),
    fullName: formData.get("fullName"),
    shopName: formData.get("shopName") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail("VALIDATION", "Please check the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: v.email,
    password: v.password,
    options: {
      // the database trigger only honours "seller"; anything else becomes a buyer
      data: { role: v.role, full_name: v.fullName, shop_name: v.role === "seller" ? v.shopName : undefined },
    },
  });
  if (error) return fail("AUTH", friendlyAuthError(error.message));

  // Email confirmation switched on in Supabase: there is no session yet.
  if (!data.session) {
    return {
      ok: true,
      data: undefined,
      message: "Account created. Check your email to confirm it, then log in.",
    };
  }

  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null, homeFor(v.role)));
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
