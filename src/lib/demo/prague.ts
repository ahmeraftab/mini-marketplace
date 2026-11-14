/**
 * The one product the test asks for, exactly as specified (section 2 of the
 * brief). Used by the seed script and the unit tests. In the running app the
 * same values are ordinary database rows entered through the seller form;
 * nothing in the buyer pages reads this file.
 */

export const PRAGUE_BASE_TITLE = "Prague Divan Bed";

/** Title shown for a given colour, e.g. "Prague Divan Bed – Cream Naples" (en dash). */
export function titleForColour(colourName: string): string {
  return `${PRAGUE_BASE_TITLE} – ${colourName}`;
}

export const PRAGUE = {
  title: titleForColour("Cream Naples"),
  basePricePence: 26999,
  compareAtPricePence: 53998,
  category: { parent: "Furniture", child: "Divan Beds" },
  description:
    "A classic divan bed with a clean, upholstered finish. Choose your fabric, size, storage, headboard and base to build the bed you want.\n\n" +
    "• Hand-finished fabric in a choice of colours\n" +
    "• Optional drawers on the left, right or foot end\n" +
    "• Free 26\" headboard included, or upgrade to a 54\" floor-standing headboard\n" +
    "• Standard base holds 50 stone; reinforced base holds 100 stone\n" +
    "• Professional assembly available as an add-on",

  colours: [
    { name: "Cream Naples", hex: "#E8DFCF" },
    { name: "Seal Grey Naples", hex: "#8C8F92" },
    { name: "Mink Naples", hex: "#A39382" },
    { name: "Silver Linoso", hex: "#C9CBCD" },
    { name: "Pink Coniston", hex: "#E2B9BF" },
    { name: "Mink Plush Velvet", hex: "#9A8778" },
  ],

  groups: [
    {
      name: "Size",
      isFilterable: true,
      defaultLabel: null as string | null, // buyer must choose
      values: [
        { label: "Small Single 2FT6", deltaPence: 9000 },
        { label: "Single 3FT", deltaPence: 9500 },
        { label: "Small Double 4FT", deltaPence: 10000 },
        { label: "Double 4FT6", deltaPence: 11000 },
        { label: "King 5FT", deltaPence: 12500 },
        { label: "Super King 6FT", deltaPence: 15000 },
      ],
    },
    {
      name: "Storage",
      isFilterable: false,
      defaultLabel: "No Storage" as string | null,
      values: [
        { label: "No Storage", deltaPence: 0 },
        { label: "2 Drawers Left Side", deltaPence: 5000 },
        { label: "2 Drawers Right Side", deltaPence: 4500 },
        { label: "2 Drawers Foot End", deltaPence: 15500 },
        { label: "4 Drawers", deltaPence: 21000 },
      ],
    },
    {
      name: "Headboard",
      isFilterable: false,
      defaultLabel: "FREE 26\" Headboard" as string | null,
      values: [
        { label: "FREE 26\" Headboard", deltaPence: 0 },
        { label: "54\" Floor Standing Headboard", deltaPence: 1000 },
      ],
    },
    {
      name: "Base",
      isFilterable: false,
      defaultLabel: "Standard Base (holds 50 stone)" as string | null,
      values: [
        { label: "Standard Base (holds 50 stone)", deltaPence: 0 },
        { label: "Reinforced Base (holds 100 stone)", deltaPence: 2500 },
      ],
    },
  ],

  addons: [{ label: "Professional Assembly", pricePence: 3999 }],
} as const;
