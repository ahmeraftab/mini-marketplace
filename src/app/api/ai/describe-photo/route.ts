import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfile } from "@/lib/auth";
import { imageUrl } from "@/lib/images";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 30;

const bodySchema = z.object({ imagePath: z.string().min(3).max(300) });

const resultSchema = z.object({
  title: z.string().trim().min(1).max(90),
  description: z.string().trim().min(1).max(1200),
  altText: z.string().trim().min(1).max(200),
});

const RATE_LIMIT = 10; // calls per window per user
const WINDOW_MINUTES = 10;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const PROMPT = `You write listing text for an online furniture marketplace in British English.
Look at the photo and return JSON with:
- title: a short product title, at most 70 characters, no brand names.
- description: 2 to 3 sentences, then a line starting "Highlights:" with 3 to 5 short highlights separated by semicolons.
- altText: one plain sentence describing what the photo shows, for screen readers.
Describe only what is visible. Do not invent sizes, materials, prices, brands or delivery promises.`;

const FALLBACK_MODEL = "gemini-3.1-flash-lite";

/** Google's "try again later" answers (and our own timeout), as opposed to a bad key or request. */
function isOverloaded(e: unknown): boolean {
  const m = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /(503|500|504)|UNAVAILABLE|overloaded|high demand|Timeout|aborted/i.test(m);
}

const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request: Request) {
  const session = await getSessionProfile();
  if (!session) return fail("Please sign in.", 401);
  if (session.role !== "seller") return fail("Only sellers can use the AI helper.", 403);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fail("The AI helper is not set up on this server.", 503);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("That request was not valid.", 400);
  const { imagePath } = parsed.data;
  // only the seller's own photos, and no path tricks
  if (!imagePath.startsWith(`${session.id}/`) || imagePath.includes("..") || imagePath.includes("//")) {
    return fail("You can only describe your own photos.", 403);
  }

  // rate limit, counted in the database so it holds across serverless instances
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countError } = await admin
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", session.id)
    .gte("created_at", since);
  if (countError) return fail("The AI helper is unavailable right now. You can write these by hand.", 503);
  if ((count ?? 0) >= RATE_LIMIT) {
    return fail(`You have used the AI helper ${RATE_LIMIT} times in the last ${WINDOW_MINUTES} minutes. Please wait a little.`, 429);
  }
  await admin.from("ai_usage").insert({ user_id: session.id });

  // load the photo from storage
  let image: { data: string; mimeType: string };
  try {
    const res = await fetch(imageUrl(imagePath), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return fail("We could not load that photo.", 404);
    const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) return fail("That file is not a supported photo.", 415);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) return fail("That photo is too large to describe.", 413);
    image = { data: bytes.toString("base64"), mimeType };
  } catch {
    return fail("We could not load that photo.", 502);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Google sometimes answers "503 high demand" for a few minutes. Try the configured
    // model, then a backup model, within the 30-second function limit.
    const primary = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const models = [primary, ...[FALLBACK_MODEL].filter((m) => m !== primary)];
    const started = Date.now();
    let response: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    let lastError: unknown = null;
    for (const model of models) {
      const remaining = 26_000 - (Date.now() - started);
      if (remaining < 4_000) break;
      try {
        response = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: image }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                altText: { type: Type.STRING },
              },
              required: ["title", "description", "altText"],
            },
            abortSignal: AbortSignal.timeout(Math.min(15_000, remaining)),
          },
        });
        break;
      } catch (e) {
        lastError = e;
        if (!isOverloaded(e)) throw e; // only an overloaded or timed-out model is worth a second try
      }
    }
    if (!response) throw lastError ?? new Error("no model answered");
    const text = response.text;
    if (!text) return fail("The AI helper returned nothing. Try again, or write these by hand.", 502);
    const json = resultSchema.safeParse(JSON.parse(text));
    if (!json.success) return fail("The AI helper's answer was not usable. Try again, or write these by hand.", 502);
    return NextResponse.json({ ok: true, ...json.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/429|quota|rate/i.test(message)) return fail("The AI helper is busy right now. Please try again in a minute.", 429);
    return fail("The AI helper is unavailable right now. You can write these by hand.", 502);
  }
}
