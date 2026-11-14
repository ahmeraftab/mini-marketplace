import { parsePounds, penceToInput } from "@/lib/money";

/** What the shop page filters on. Lives in the URL so results can be shared and bookmarked. */
export type BrowseParams = {
  q: string;
  category: string | null; // category slug
  colours: string[];
  sizes: string[];
  minPence: number | null;
  maxPence: number | null;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const many = (v: string | string[] | undefined): string[] => {
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(list.map((s) => s.trim()).filter(Boolean))].slice(0, 20).map((s) => s.slice(0, 80));
};

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export function parseBrowseParams(raw: RawSearchParams): BrowseParams {
  const min = one(raw.min) ? parsePounds(one(raw.min)) : null;
  const max = one(raw.max) ? parsePounds(one(raw.max)) : null;
  return {
    q: one(raw.q).slice(0, 80),
    category: one(raw.category).slice(0, 80) || null,
    colours: many(raw.colour),
    sizes: many(raw.size),
    minPence: min,
    maxPence: max,
  };
}

/** Back into a query string (used for chips, pagination and the filter sheet). */
export function browseToSearch(p: BrowseParams): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  for (const c of p.colours) sp.append("colour", c);
  for (const s of p.sizes) sp.append("size", s);
  if (p.minPence != null) sp.set("min", penceToInput(p.minPence));
  if (p.maxPence != null) sp.set("max", penceToInput(p.maxPence));
  const text = sp.toString();
  return text ? `?${text}` : "";
}

export function hasActiveFilters(p: BrowseParams): boolean {
  return Boolean(p.q || p.category || p.colours.length || p.sizes.length || p.minPence != null || p.maxPence != null);
}

export const emptyBrowse: BrowseParams = {
  q: "",
  category: null,
  colours: [],
  sizes: [],
  minPence: null,
  maxPence: null,
};
