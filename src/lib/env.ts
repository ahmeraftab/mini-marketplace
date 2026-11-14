import { z } from "zod";

/**
 * Environment validation with clear messages. NEXT_PUBLIC_* variables must be
 * read as literal `process.env.NEXT_PUBLIC_X` expressions so Next can inline
 * them into the browser bundle.
 */
const publicSchema = z.object({
  url: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a full https:// URL" }),
  publishableKey: z.string().min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function readPublicEnv(): PublicEnv | null {
  const parsed = publicSchema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  return parsed.success ? parsed.data : null;
}

export function isSupabaseConfigured(): boolean {
  return readPublicEnv() !== null;
}

export function getPublicEnv(): PublicEnv {
  const env = readPublicEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  return env;
}

/** Server-only secrets. Never import this file's server helpers from client code. */
export function getSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY is not set (server-side only; needed for checkout and the AI feature).");
  }
  return key;
}

export function getGeminiConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return { apiKey, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" };
}
