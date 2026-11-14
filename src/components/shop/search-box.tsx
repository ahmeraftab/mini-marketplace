"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/** Debounced search that keeps every other filter in the URL. */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setValue(initial), [initial]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function push(next: string) {
    const sp = new URLSearchParams(params.toString());
    if (next.trim()) sp.set("q", next.trim());
    else sp.delete("q");
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        push(value);
      }}
      className="relative"
    >
      <label htmlFor="shop-search" className="sr-only">Search beds</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-muted" />
      <input
        id="shop-search"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        placeholder="Search beds, colours, shops"
        onChange={(e) => {
          setValue(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => push(e.target.value), 300);
        }}
        className="h-12 w-full rounded-control border border-line-strong bg-surface pl-10 pr-11 text-base outline-none placeholder:text-ink-muted/80 focus:border-ink"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setValue(""); push(""); }}
          className="absolute right-0 top-1/2 grid size-12 -translate-y-1/2 place-items-center text-ink-muted hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  );
}
