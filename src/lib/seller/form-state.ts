import type { SaveProductPayload } from "@/lib/catalog/payload";
import type { ProductDetail } from "@/lib/catalog/types";
import { newId } from "@/lib/ids";
import { parsePounds, penceToInput } from "@/lib/money";
import { saveProductSchema } from "./payload-schema";

/**
 * Seller form state. Money is kept as the text the seller typed, so
 * "269.9" stays "269.9" while typing; it is parsed only when saving.
 */
export type FormColour = { id: string; name: string; hex: string; title: string; titleEdited: boolean };
export type FormPhoto = {
  id: string;
  colourId: string | null;
  path: string;
  alt: string;
  width: number | null;
  height: number | null;
};
export type FormValue = { id: string; label: string; price: string };
export type FormGroup = { id: string; name: string; isFilterable: boolean; defaultId: string | null; values: FormValue[] };
export type FormAddon = { id: string; label: string; price: string };

export type FormState = {
  id: string;
  isNew: boolean;
  status: "draft" | "pending" | "approved" | "hidden";
  categoryId: string;
  description: string;
  basePrice: string;
  compareAt: string;
  colours: FormColour[];
  photos: FormPhoto[];
  groups: FormGroup[];
  addons: FormAddon[];
};

export function emptyForm(categoryId: string): FormState {
  return {
    id: newId(),
    isNew: true,
    status: "draft",
    categoryId,
    description: "",
    basePrice: "",
    compareAt: "",
    colours: [{ id: newId(), name: "", hex: "#E8DFCF", title: "", titleEdited: false }],
    photos: [],
    groups: [],
    addons: [],
  };
}

export function formFromProduct(p: ProductDetail): FormState {
  return {
    id: p.id,
    isNew: false,
    status: p.status,
    categoryId: p.category.id,
    description: p.description,
    basePrice: penceToInput(p.basePricePence),
    compareAt: p.compareAtPricePence != null ? penceToInput(p.compareAtPricePence) : "",
    colours: p.colours.map((c) => ({ id: c.id, name: c.name, hex: c.hex, title: c.title, titleEdited: true })),
    photos: p.images.map((i) => ({
      id: i.id,
      colourId: i.colourId,
      path: i.path,
      alt: i.alt,
      width: i.width,
      height: i.height,
    })),
    groups: p.groups.map((g) => ({
      id: g.id,
      name: g.name,
      isFilterable: g.isFilterable,
      defaultId: g.values.find((v) => v.isDefault)?.id ?? null,
      values: g.values.map((v) => ({ id: v.id, label: v.label, price: penceToInput(v.priceDeltaPence) })),
    })),
    addons: p.addons.map((a) => ({ id: a.id, label: a.label, price: penceToInput(a.pricePence) })),
  };
}

/** "Prague Divan Bed – Cream Naples": a sensible title for a new colour, taken from the main colour's title. */
export function suggestTitle(mainTitle: string, mainColourName: string, colourName: string): string {
  const name = colourName.trim();
  if (!name) return "";
  const main = mainTitle.trim();
  const mainName = mainColourName.trim();
  if (main && mainName && main.endsWith(mainName)) {
    return `${main.slice(0, main.length - mainName.length)}${name}`.trim();
  }
  return main ? `${main} – ${name}` : name;
}

function price(text: string): number | null {
  if (!text.trim()) return null;
  return parsePounds(text);
}

export type BuildResult =
  | { ok: true; payload: SaveProductPayload }
  | { ok: false; errors: Record<string, string> };

/**
 * Converts the form into the database payload and validates it. Errors are
 * keyed like the form: "basePrice", "colours.0.name", "groups.1.values.2.price".
 */
export function buildPayload(form: FormState, submit: boolean): BuildResult {
  const errors: Record<string, string> = {};

  const base = price(form.basePrice);
  if (base == null) errors.basePrice = form.basePrice.trim() ? "Enter a price like 269.99" : "Price is required";
  const compare = price(form.compareAt);
  if (form.compareAt.trim() && compare == null) errors.compareAt = "Enter a price like 539.98";

  const groups = form.groups.map((g, gi) => ({
    id: g.id,
    name: g.name,
    is_filterable: g.isFilterable,
    values: g.values.map((v, vi) => {
      const p = v.price.trim() === "" ? 0 : parsePounds(v.price);
      if (p == null) errors[`groups.${gi}.values.${vi}.price`] = "Enter an amount like 90 or 0";
      return { id: v.id, label: v.label, price_delta_pence: p ?? 0, is_default: g.defaultId === v.id };
    }),
  }));

  const addons = form.addons.map((a, ai) => {
    const p = price(a.price);
    if (p == null) errors[`addons.${ai}.price`] = "Enter an amount like 39.99";
    return { id: a.id, label: a.label, price_pence: p ?? 0 };
  });

  if (Object.keys(errors).length) return { ok: false, errors };

  const candidate = {
    id: form.id,
    category_id: form.categoryId,
    description: form.description,
    base_price_pence: base as number,
    compare_at_price_pence: form.compareAt.trim() ? (compare as number) : null,
    submit,
    colours: form.colours.map((c) => ({ id: c.id, name: c.name, hex: c.hex, title: c.title })),
    images: form.photos.map((p) => ({
      id: p.id,
      colour_id: p.colourId,
      storage_path: p.path,
      alt: p.alt,
      width: p.width,
      height: p.height,
    })),
    groups,
    addons,
  };

  const parsed = saveProductSchema.safeParse(candidate);
  if (parsed.success) return { ok: true, payload: parsed.data as SaveProductPayload };

  const map: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const [head, ...rest] = issue.path.map(String);
    let key = [head, ...rest].join(".");
    if (head === "base_price_pence") key = "basePrice";
    else if (head === "compare_at_price_pence") key = "compareAt";
    else if (head === "category_id") key = "categoryId";
    else if (head === "colours" && rest.length === 2) key = `colours.${rest[0]}.${rest[1]}`;
    else if (head === "groups" && rest.length >= 3 && rest[1] === "values") {
      key = `groups.${rest[0]}.values.${rest[2]}.${rest[3] === "price_delta_pence" ? "price" : (rest[3] ?? "")}`;
    } else if (head === "addons" && rest.length === 2) {
      key = `addons.${rest[0]}.${rest[1] === "price_pence" ? "price" : rest[1]}`;
    }
    if (!map[key]) map[key] = issue.message;
  }
  return { ok: false, errors: map };
}

/** What blocks "Submit for approval" even though a draft may be saved. */
export function submissionProblems(form: FormState): string[] {
  const out: string[] = [];
  if (form.photos.length < 5) out.push(`Add at least 5 photos (you have ${form.photos.length}).`);
  if (!form.colours.some((c) => c.name.trim())) out.push("Add at least one colour.");
  if (!form.description.trim()) out.push("Write a short description.");
  return out;
}
