import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** One cheap query. The daily cron calls it so a free-tier database never pauses for inactivity. */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("categories").select("id", { head: true, count: "exact" }).limit(1);
    if (error) return NextResponse.json({ ok: false }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
