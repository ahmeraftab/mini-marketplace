"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import { Select } from "@/components/ui/field";
import { Input } from "@/components/ui/field";
import { newId } from "@/lib/ids";
import { imageUrl } from "@/lib/images";
import type { FormColour, FormPhoto } from "@/lib/seller/form-state";
import { uploadProductPhoto, validateImageFile } from "@/lib/seller/upload";

type Props = {
  sellerId: string;
  productId: string;
  photos: FormPhoto[];
  colours: FormColour[];
  onChange: (photos: FormPhoto[]) => void;
  error?: string;
  /** Extra controls under the grid (the AI helper sits here). */
  children?: React.ReactNode;
};

export function PhotosEditor({ sellerId, productId, photos, colours, onChange, error, children }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  // uploads finish out of order, so always merge into the latest list
  const latest = useRef(photos);
  latest.current = photos;

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const room = 40 - latest.current.length;
    const problemsNow: string[] = [];
    const accepted: File[] = [];
    for (const f of list) {
      const p = validateImageFile(f);
      if (p) problemsNow.push(p);
      else accepted.push(f);
    }
    if (accepted.length > room) {
      problemsNow.push(`You can have at most 40 photos, so ${accepted.length - room} were skipped.`);
      accepted.length = Math.max(0, room);
    }
    setProblems(problemsNow);
    setBusy((n) => n + accepted.length);
    await Promise.all(
      accepted.map(async (file) => {
        try {
          const up = await uploadProductPhoto(file, sellerId, productId);
          const next: FormPhoto = {
            id: newId(),
            colourId: null,
            path: up.path,
            alt: "",
            width: up.width,
            height: up.height,
          };
          onChange([...latest.current, next]);
          latest.current = [...latest.current, next];
        } catch (e) {
          setProblems((prev) => [...prev, `${file.name}: ${e instanceof Error ? e.message : "upload failed"}`]);
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  const update = (id: string, patch: Partial<FormPhoto>) =>
    onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, i) => (
          <div key={photo.id} className="rounded-card border border-line bg-surface p-3" data-testid="photo-card">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[3px] bg-paper-deep">
              <Image src={imageUrl(photo.path)} alt={photo.alt || `Photo ${i + 1}`} fill sizes="320px" className="object-cover" />
              <span className="absolute left-2 top-2 rounded-full bg-ink/75 px-2 py-0.5 text-xs font-medium text-paper">{i + 1}</span>
            </div>
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-medium text-ink-muted" htmlFor={`${inputId}-c-${photo.id}`}>Shown for</label>
              <Select
                id={`${inputId}-c-${photo.id}`}
                value={photo.colourId ?? ""}
                onChange={(e) => update(photo.id, { colourId: e.target.value || null })}
              >
                <option value="">All colours</option>
                {colours.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || "Unnamed colour"}</option>
                ))}
              </Select>
              <Input
                aria-label={`Description of photo ${i + 1}`}
                placeholder="Describe this photo (alt text)"
                value={photo.alt}
                maxLength={200}
                onChange={(e) => update(photo.id, { alt: e.target.value })}
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="grid size-11 place-items-center rounded-control border border-line-strong hover:border-ink disabled:opacity-35">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label={`Move photo ${i + 1} later`} className="grid size-11 place-items-center rounded-control border border-line-strong hover:border-ink disabled:opacity-35">
                    <ArrowDown className="size-4" />
                  </button>
                </div>
                <button type="button" onClick={() => onChange(photos.filter((p) => p.id !== photo.id))} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted hover:text-clay">
                  <Trash2 className="size-4" /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        <label
          htmlFor={inputId}
          className="grid min-h-48 cursor-pointer place-items-center rounded-card border-2 border-dashed border-line-strong bg-paper-deep/40 p-6 text-center transition-colors hover:border-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink"
        >
          <span>
            {busy > 0 ? <Loader2 className="mx-auto size-7 animate-spin text-ink-muted" /> : <ImagePlus className="mx-auto size-7 text-ink-muted" strokeWidth={1.5} />}
            <span className="mt-2 block font-medium">{busy > 0 ? `Uploading ${busy}…` : "Add photos"}</span>
            <span className="mt-0.5 block text-sm text-ink-muted">JPG, PNG or WebP. Resized for you.</span>
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => void addFiles(e.target.files)}
          />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-clay">{error}</p>}
      {problems.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 text-sm text-clay">
          {problems.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      )}
      <p className="mt-3 text-sm text-ink-muted">{photos.length} photo{photos.length === 1 ? "" : "s"}. At least 5 are needed to submit for approval. The first photo for each colour is its main image.</p>
      {children}
    </div>
  );
}
