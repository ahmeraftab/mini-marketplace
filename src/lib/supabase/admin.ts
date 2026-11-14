import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv, getSecretKey } from "@/lib/env";

/**
 * Service-role client. It bypasses row-level security, so it is used ONLY for:
 *   - placing orders (after prices are recomputed on the server),
 *   - creating accounts at sign-up (already confirmed, because no emails are sent),
 *   - the AI endpoint's rate limit table,
 *   - cleaning up unreferenced product photos.
 * Never import this from a client component (the `server-only` import above
 * makes the build fail if someone tries).
 */
export function createAdminClient(): SupabaseClient {
  return createSupabaseClient(getPublicEnv().url, getSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
