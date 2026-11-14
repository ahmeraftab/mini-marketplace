"use client";

import { Check, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { browseToSearch, hasActiveFilters, emptyBrowse, type BrowseParams } from "@/lib/catalog/browse";
import type { Facets } from "@/lib/catalog/types";
import { cn } from "@/lib/cn";
import { formatPence, parsePounds, penceToInput } from "@/lib/money";

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

function Panel({
  draft,
  facets,
  onChange,
}: {
  draft: BrowseParams;
  facets: Facets;
  onChange: (next: BrowseParams) => void;
}) {
  const [min, setMin] = useState(draft.minPence != null ? penceToInput(draft.minPence) : "");
  const [max, setMax] = useState(draft.maxPence != null ? penceToInput(draft.maxPence) : "");
  const [seen, setSeen] = useState(`${draft.minPence}|${draft.maxPence}`);
  if (seen !== `${draft.minPence}|${draft.maxPence}`) {
    setSeen(`${draft.minPence}|${draft.maxPence}`);
    setMin(draft.minPence != null ? penceToInput(draft.minPence) : "");
    setMax(draft.maxPence != null ? penceToInput(draft.maxPence) : "");
  }

  const minBad = min.trim() !== "" && parsePounds(min) == null;
  const maxBad = max.trim() !== "" && parsePounds(max) == null;
  const commitPrice = () => {
    const lo = min.trim() ? parsePounds(min) : null;
    const hi = max.trim() ? parsePounds(max) : null;
    if ((min.trim() && lo == null) || (max.trim() && hi == null)) return;
    if (lo != null && hi != null && lo > hi) {
      onChange({ ...draft, minPence: hi, maxPence: lo });
      return;
    }
    if (lo === draft.minPence && hi === draft.maxPence) return;
    onChange({ ...draft, minPence: lo, maxPence: hi });
  };

  const parents = facets.categories.filter((c) => c.parentId === null);
  const childrenOf = (id: string) => facets.categories.filter((c) => c.parentId === id);

  return (
    <div className="space-y-8">
      <section aria-labelledby="f-cat">
        <h3 id="f-cat" className="mb-3 text-[15px] font-semibold">Category</h3>
        <div role="radiogroup" aria-labelledby="f-cat">
        <ul className="space-y-1">
          <li>
            <CheckRow label="All" checked={!draft.category} onClick={() => onChange({ ...draft, category: null })} radio />
          </li>
          {parents.map((p) => (
            <li key={p.id}>
              <CheckRow label={p.name} checked={draft.category === p.slug} onClick={() => onChange({ ...draft, category: p.slug })} radio />
              <ul className="ml-6">
                {childrenOf(p.id).map((c) => (
                  <li key={c.id}>
                    <CheckRow label={c.name} checked={draft.category === c.slug} onClick={() => onChange({ ...draft, category: c.slug })} radio />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        </div>
      </section>

      {facets.colours.length > 0 && (
        <section aria-labelledby="f-col">
          <h3 id="f-col" className="mb-3 text-[15px] font-semibold">Colour</h3>
          <ul className="flex flex-wrap gap-1">
            {facets.colours.map((c) => {
              const on = draft.colours.includes(c.name);
              return (
                <li key={c.name}>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => onChange({ ...draft, colours: toggle(draft.colours, c.name) })}
                    className="relative grid size-11 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    <span className={cn("absolute inset-1.5 rounded-full border border-black/15 transition-transform", on && "scale-90")} style={{ backgroundColor: c.hex }} />
                    <span className={cn("absolute inset-0 rounded-full border-2 transition-opacity", on ? "border-ink opacity-100" : "border-transparent opacity-0")} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {facets.sizes.length > 0 && (
        <section aria-labelledby="f-size">
          <h3 id="f-size" className="mb-3 text-[15px] font-semibold">Size</h3>
          <ul className="space-y-1">
            {facets.sizes.map((s) => (
              <li key={s}>
                <CheckRow label={s} checked={draft.sizes.includes(s)} onClick={() => onChange({ ...draft, sizes: toggle(draft.sizes, s) })} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="f-price">
        <h3 id="f-price" className="mb-3 text-[15px] font-semibold">Price</h3>
        <div className="flex items-center gap-2">
          <PriceInput label="Minimum price in pounds" value={min} onChange={setMin} onCommit={commitPrice} bad={minBad} placeholder={facets.minPence != null ? String(Math.floor(facets.minPence / 100)) : "Min"} />
          <span aria-hidden="true" className="text-ink-muted">–</span>
          <PriceInput label="Maximum price in pounds" value={max} onChange={setMax} onCommit={commitPrice} bad={maxBad} placeholder={facets.maxPence != null ? String(Math.ceil(facets.maxPence / 100)) : "Max"} />
        </div>
        {(minBad || maxBad) && <p role="alert" className="mt-2 text-sm text-clay">Enter a price like 250 or 250.50</p>}
        {facets.minPence != null && facets.maxPence != null && (
          <p className="mt-2 text-xs text-ink-muted">Listings from {formatPence(facets.minPence)} to {formatPence(facets.maxPence)}</p>
        )}
      </section>
    </div>
  );
}

function PriceInput({ label, value, onChange, onCommit, bad, placeholder }: { label: string; value: string; onChange: (v: string) => void; onCommit: () => void; bad: boolean; placeholder: string }) {
  return (
    <div className="relative min-w-0 flex-1">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
      <input
        aria-label={label}
        aria-invalid={bad || undefined}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
        }}
        className={cn("h-11 w-full rounded-control border bg-surface pl-7 pr-2 text-base outline-none focus:border-ink", bad ? "border-clay" : "border-line-strong")}
      />
    </div>
  );
}

function CheckRow({ label, checked, onClick, radio }: { label: string; checked: boolean; onClick: () => void; radio?: boolean }) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-3 rounded-control px-1 text-left text-[15px] outline-none hover:bg-paper-deep focus-visible:ring-2 focus-visible:ring-ink"
    >
      <span className={cn("grid size-5 shrink-0 place-items-center border transition-colors", radio ? "rounded-full" : "rounded-[4px]", checked ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface")}>
        <Check className={cn("size-3 transition-opacity", checked ? "opacity-100" : "opacity-0")} strokeWidth={3} />
      </span>
      {label}
    </button>
  );
}

/** Desktop: applies instantly. Mobile: a bottom sheet with Show results / Clear. */
export function Filters({ params, facets }: { params: BrowseParams; facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(params);

  const [seenParams, setSeenParams] = useState(params);
  if (params !== seenParams) {
    setSeenParams(params);
    setDraft(params);
  }

  const apply = (next: BrowseParams) =>
    startTransition(() => router.replace(`${pathname}${browseToSearch(next)}`, { scroll: false }));

  const activeCount =
    params.colours.length + params.sizes.length + (params.category ? 1 : 0) + (params.minPence != null || params.maxPence != null ? 1 : 0);

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters" aria-busy={pending}>
        <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-display text-xl">Filter</h2>
            {hasActiveFilters(params) && (
              <button type="button" className="text-sm underline underline-offset-4 hover:text-clay" onClick={() => apply({ ...emptyBrowse })}>
                Clear all
              </button>
            )}
          </div>
          <Panel draft={params} facets={facets} onChange={apply} />
        </div>
      </aside>

      <div className="mb-4 lg:hidden">
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
          <SlidersHorizontal className="size-4" />
          Filter{activeCount ? ` (${activeCount})` : ""}
        </Button>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title="Filter"
          footer={
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  const cleared = { ...emptyBrowse, q: draft.q };
                  setDraft(cleared);
                  apply(cleared);
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  apply(draft);
                  setOpen(false);
                }}
              >
                Show results
              </Button>
            </div>
          }
        >
          <Panel draft={draft} facets={facets} onChange={setDraft} />
        </Sheet>
      </div>
    </>
  );
}

export function ActiveChips({ params }: { params: BrowseParams }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const go = (next: BrowseParams) =>
    startTransition(() => router.replace(`${pathname}${browseToSearch(next)}`, { scroll: false }));

  const chips: Array<{ key: string; label: string; remove: () => void }> = [];
  if (params.category) chips.push({ key: "cat", label: params.category.replace(/-/g, " "), remove: () => go({ ...params, category: null }) });
  for (const c of params.colours) chips.push({ key: `c-${c}`, label: c, remove: () => go({ ...params, colours: params.colours.filter((x) => x !== c) }) });
  for (const s of params.sizes) chips.push({ key: `s-${s}`, label: s, remove: () => go({ ...params, sizes: params.sizes.filter((x) => x !== s) }) });
  if (params.minPence != null || params.maxPence != null) {
    const label = `${params.minPence != null ? formatPence(params.minPence) : "Any"} – ${params.maxPence != null ? formatPence(params.maxPence) : "Any"}`;
    chips.push({ key: "price", label, remove: () => go({ ...params, minPence: null, maxPence: null }) });
  }
  if (!chips.length) return <span />;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.key}>
          <button
            type="button"
            onClick={c.remove}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong bg-surface py-1 pl-3.5 pr-3 text-sm capitalize hover:border-ink"
          >
            {c.label}
            <X className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
