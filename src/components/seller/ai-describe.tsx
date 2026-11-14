"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import type { FormPhoto } from "@/lib/seller/form-state";

type Suggestion = { title: string; description: string; altText: string };

/**
 * "Describe with AI": the seller picks one of their uploaded photos and gets a
 * suggested title, description and alt text. Nothing is applied until the
 * seller presses a "Use" button, and existing text is never overwritten silently.
 */
export function AiDescribe({
  enabled,
  photos,
  hasText,
  onUseTitle,
  onUseDescription,
  onUseAlt,
}: {
  enabled: boolean;
  photos: FormPhoto[];
  hasText: boolean;
  onUseTitle: (title: string) => void;
  onUseDescription: (description: string) => void;
  onUseAlt: (photoId: string, alt: string) => void;
}) {
  const [photoId, setPhotoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(Suggestion & { photoId: string }) | null>(null);

  const chosen = photos.find((p) => p.id === photoId) ?? photos[0];

  async function run() {
    if (!chosen || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/describe-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagePath: chosen.path }),
      });
      const body = (await res.json().catch(() => null)) as
        | ({ ok: true } & Suggestion)
        | { ok: false; message?: string }
        | null;
      if (!res.ok || !body || !body.ok) {
        setError(body && !body.ok && body.message ? body.message : "The AI helper is unavailable right now. You can write these by hand.");
      } else {
        setResult({ title: body.title, description: body.description, altText: body.altText, photoId: chosen.id });
      }
    } catch {
      setError("We could not reach the AI helper. You can write these by hand.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-card border border-line bg-paper-deep/50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-clay" strokeWidth={1.6} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg">Describe with AI</h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            Pick a photo and get a suggested title, description and alt text. You decide what to keep. Use sample photos only.
          </p>
          {!enabled ? (
            <p className="mt-3 text-sm text-ink-muted">The AI helper is not set up on this server, so write these by hand for now.</p>
          ) : photos.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">Upload a photo first.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="sm:w-60">
                <Select aria-label="Photo to describe" value={chosen?.id ?? ""} onChange={(e) => setPhotoId(e.target.value)}>
                  {photos.map((p, i) => (
                    <option key={p.id} value={p.id}>Photo {i + 1}</option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="secondary" onClick={() => void run()} disabled={loading} data-testid="ai-describe">
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {loading ? "Looking at the photo…" : "Suggest text"}
              </Button>
            </div>
          )}
          {error && <p role="alert" className="mt-3 text-sm font-medium text-clay">{error}</p>}
        </div>
      </div>

      {result && (
        <div className="mt-5 space-y-4 border-t border-line pt-5" data-testid="ai-result">
          <Row label="Title" text={result.title} action="Use title" onUse={() => onUseTitle(result.title)} />
          <Row label="Description" text={result.description} action="Use description" onUse={() => onUseDescription(result.description)} multiline />
          <Row label="Alt text" text={result.altText} action="Use as alt text" onUse={() => onUseAlt(result.photoId, result.altText)} />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onUseTitle(result.title);
              onUseDescription(result.description);
              onUseAlt(result.photoId, result.altText);
            }}
          >
            Use all three
          </Button>
          {hasText && <p className="text-xs text-ink-muted">You already have some text. Using a suggestion replaces it.</p>}
        </div>
      )}
    </div>
  );
}

function Row({ label, text, action, onUse, multiline }: { label: string; text: string; action: string; onUse: () => void; multiline?: boolean }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[6rem_1fr_auto] sm:items-start">
      <p className="text-sm font-semibold">{label}</p>
      <p className={multiline ? "whitespace-pre-line text-[15px] leading-relaxed" : "text-[15px]"}>{text}</p>
      <Button type="button" size="sm" variant="secondary" onClick={onUse}>{action}</Button>
    </div>
  );
}
