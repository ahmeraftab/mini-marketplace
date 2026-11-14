"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, zodFieldErrors, type ActionResult } from "@/lib/action-result";
import { homeFor, type Role } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { safeNextPath } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Where to go after signing in: a safe `next` link if there is one, otherwise the role's own home (the form's default "/" does not count). */
function landingPath(next: FormDataEntryValue | null, home: string): string {
  if (typeof next !== "string" || next === "/" || next === "") return home;
  return safeNextPath(next, home);
}

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
  redirect(landingPath(formData.get("next"), homeFor(role)));
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

  // The demo sends no emails, so the account is created already confirmed (server side,
  // with the service role) and the person is signed straight in. This does not depend on the
  // project's "Confirm email" setting or its small built-in mail quota.
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    // the database trigger only honours "seller"; anything else becomes a buyer
    user_metadata: { role: v.role, full_name: v.fullName, shop_name: v.role === "seller" ? v.shopName : undefined },
  });
  if (created.error) return fail("AUTH", friendlyAuthError(created.error.message));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
  if (error) return fail("AUTH", "Your account was created. Please log in.");

  redirect(landingPath(formData.get("next"), homeFor(v.role)));
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
