import { z } from "zod";
import { MAX_PRICE_PENCE } from "@/lib/money";

/**
 * Validation for the `save_product` payload. The seller form runs it for
 * friendly field errors, the server action runs it again (never trust the
 * browser), and the database enforces the same rules a third time.
 */
const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);

const pence = z
  .number({ error: "Enter a price" })
  .int("Prices are whole pence")
  .min(0, "Price cannot be negative")
  .max(MAX_PRICE_PENCE, "That price is too high");

const colour = z.object({
  id: z.uuid(),
  name: text("Colour name", 60),
  hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a colour like #E8DFCF"),
  title: text("Title", 140),
});

const image = z.object({
  id: z.uuid(),
  colour_id: z.uuid().nullable(),
  storage_path: z.string().min(1).max(300),
  alt: z.string().trim().max(200, "Alt text is too long"),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
});

const value = z.object({
  id: z.uuid(),
  label: text("Option name", 80),
  price_delta_pence: pence,
  is_default: z.boolean(),
});

const group = z.object({
  id: z.uuid(),
  name: text("Group name", 60),
  is_filterable: z.boolean(),
  values: z.array(value).min(1, "Add at least one choice").max(30, "At most 30 choices per group"),
});

const addon = z.object({
  id: z.uuid(),
  label: text("Extra name", 80),
  price_pence: pence,
});

export const saveProductSchema = z
  .object({
    id: z.uuid(),
    category_id: z.uuid("Choose a category"),
    description: z.string().trim().max(4000, "The description is too long"),
    base_price_pence: pence,
    compare_at_price_pence: pence.nullable(),
    submit: z.boolean(),
    colours: z.array(colour).min(1, "Add at least one colour").max(20, "At most 20 colours"),
    images: z.array(image).max(40, "At most 40 photos"),
    groups: z.array(group).max(10, "At most 10 option groups"),
    addons: z.array(addon).max(10, "At most 10 extras"),
  })
  .superRefine((p, ctx) => {
    if (p.compare_at_price_pence != null && p.compare_at_price_pence <= p.base_price_pence) {
      ctx.addIssue({ code: "custom", path: ["compare_at_price_pence"], message: "Must be higher than the price" });
    }
    const dupes = (names: string[]) => new Set(names.map((n) => n.trim().toLowerCase())).size !== names.length;
    if (dupes(p.colours.map((c) => c.name))) {
      ctx.addIssue({ code: "custom", path: ["colours"], message: "Colour names must be different" });
    }
    if (dupes(p.groups.map((g) => g.name))) {
      ctx.addIssue({ code: "custom", path: ["groups"], message: "Option group names must be different" });
    }
    p.groups.forEach((g, gi) => {
      if (dupes(g.values.map((v) => v.label))) {
        ctx.addIssue({ code: "custom", path: ["groups", gi, "values"], message: "Choices in a group must be different" });
      }
      if (g.values.filter((v) => v.is_default).length > 1) {
        ctx.addIssue({ code: "custom", path: ["groups", gi, "values"], message: "Only one choice can be the default" });
      }
    });
    const colourIds = new Set(p.colours.map((c) => c.id));
    p.images.forEach((img, i) => {
      if (img.colour_id && !colourIds.has(img.colour_id)) {
        ctx.addIssue({ code: "custom", path: ["images", i, "colour_id"], message: "Photo is assigned to a missing colour" });
      }
    });
  });

export type ValidSaveProduct = z.infer<typeof saveProductSchema>;
