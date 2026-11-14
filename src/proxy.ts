import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readPublicEnv } from "@/lib/env";

/**
 * Next.js 16 "proxy" (formerly middleware). Its only job is to keep the
 * Supabase auth session fresh by refreshing cookies on the way through.
 * It is NOT an authorisation layer: every page and database call checks access
 * itself (and the database enforces it with RLS).
 */
export async function proxy(request: NextRequest) {
  const env = readPublicEnv();
  if (!env) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        // keeps CDNs from caching one person's session for another
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  try {
    await supabase.auth.getClaims();
  } catch {
    // An unreachable auth server must not take the whole site down.
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|seed/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|avif)$).*)",
  ],
};
