"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Browser client (uses the publishable key; RLS protects every table). */
export function getBrowserClient(): SupabaseClient {
  if (!client) {
    const env = getPublicEnv();
    client = createBrowserClient(env.url, env.publishableKey);
  }
  return client;
}
