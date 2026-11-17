import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampQuantity,
  compareAtForPercent,
  discountPercentFor,
  priceConfiguration,
} from "../../src/lib/pricing";
import { buildPragueForPricing, pick } from "../fixtures/prague";

const product = buildPragueForPricing();

const DEFAULTS = {
  Storage: "No Storage",
  Headboard: 'FREE 26" Headboard',
  Base: "Standard Base (holds 50 stone)",
} as const;

describe("priceConfiguration: Appendix B rows", () => {
  const rows: Array<{
    name: string;
    selection: ReturnType<typeof pick>;
    unit: number;
    was: number;
  }> = [
    {
      name: "1 Small Single, defaults",
      selection: pick({ Size: "Small Single 2FT6", ...DEFAULTS }),
      unit: 35999,
      was: 62998,
    },
    {
      name: "2 Single + 2 drawers left",
      selection: pick({
        Size: "Single 3FT",
        Storage: "2 Drawers Left Side",
        Headboard: DEFAULTS.Headboard,
        Base: DEFAULTS.Base,
      }),
      unit: 41499,
      was: 68498,
    },
    {
      name: "3 Double + right drawers + 54in headboard + reinforced",
      selection: pick({
        Size: "Double 4FT6",
        Storage: "2 Drawers Right Side",
        Headboard: '54" Floor Standing Headboard',
        Base: "Reinforced Base (holds 100 stone)",
      }),
      unit: 45999,
      was: 72998,
    },
    {
      name: "4 King + foot-end drawers + assembly",
      selection: pick(
        {
          Size: "King 5FT",
          Storage: "2 Drawers Foot End",
          Headboard: DEFAULTS.Headboard,
          Base: DEFAULTS.Base,
        },
        { assembly: true },
      ),
      unit: 58998,
      was: 85997,
    },
    {
      name: "5 Super King, everything",
      selection: pick(
        {
          Size: "Super King 6FT",
          Storage: "4 Drawers",
          Headboard: '54" Floor Standing Headboard',
          Base: "Reinforced Base (holds 100 stone)",
        },
        { assembly: true },
      ),
      unit: 70498,
      was: 97497,
    },
    {
      name: "6 Small Double + 54in headboard",
      selection: pick({
        Size: "Small Double 4FT",
        Storage: DEFAULTS.Storage,
        Headboard: '54" Floor Standing Headboard',
        Base: DEFAULTS.Base,
      }),
      unit: 37999,
      was: 64998,
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      const result = priceConfiguration(product, row.selection);
      assert.equal(result.ok, true);
      assert.equal(result.unitPence, row.unit);
      assert.equal(result.wasUnitPence, row.was);
      assert.equal(result.savingPence, 26999);
      assert.equal(result.discountPercent, 50);
      assert.equal(result.lineTotalPence, row.unit);
    });
  }
});

describe("priceConfiguration: opening state and edge cases", () => {
  it("row 0: with nothing chosen it shows the base price, 50% off, and is not ok", () => {
    const result = priceConfiguration(product, pick({}));
    assert.equal(result.unitPence, 26999);
    assert.equal(result.wasUnitPence, 53998);
    assert.equal(result.discountPercent, 50);
    assert.equal(result.ok, false);
    assert.equal(result.missingGroupIds.length, 4);
  });

  it("only size missing when the other groups are defaulted", () => {
    const result = priceConfiguration(product, pick({ ...DEFAULTS }));
    assert.deepEqual(result.missingGroupIds, ["g:Size"]);
    assert.equal(result.ok, false);
  });

  it("quantity multiplies the whole unit price including assembly", () => {
    const result = priceConfiguration(
      product,
      pick(
        {
          Size: "King 5FT",
          Storage: "2 Drawers Foot End",
          Headboard: DEFAULTS.Headboard,
          Base: DEFAULTS.Base,
        },
        { assembly: true, quantity: 2 },
      ),
    );
    assert.equal(result.lineTotalPence, 117996);
  });

  it("ignores a value id that belongs to a different group", () => {
    const result = priceConfiguration(product, {
      valueIds: { "g:Size": "v:Storage:4 Drawers" },
      addonIds: [],
      quantity: 1,
    });
    assert.deepEqual(result.missingGroupIds.includes("g:Size"), true);
    assert.equal(result.unitPence, 26999);
  });

  it("flags an unknown add-on and does not charge for it", () => {
    const result = priceConfiguration(product, {
      ...pick({ Size: "Single 3FT", ...DEFAULTS }),
      addonIds: ["a:Does Not Exist"],
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.unknownAddonIds, ["a:Does Not Exist"]);
    assert.equal(result.unitPence, 26999 + 9500);
  });

  it("charges a duplicated add-on id once", () => {
    const base = pick({ Size: "Single 3FT", ...DEFAULTS });
    const once = priceConfiguration(product, {
      ...base,
      addonIds: ["a:Professional Assembly"],
    });
    const twice = priceConfiguration(product, {
      ...base,
      addonIds: ["a:Professional Assembly", "a:Professional Assembly"],
    });
    assert.equal(twice.unitPence, once.unitPence);
  });

  it("a product without a compare-at price has no was/saving/discount", () => {
    const plain = { ...product, compareAtPricePence: null };
    const result = priceConfiguration(plain, pick({ Size: "Single 3FT", ...DEFAULTS }));
    assert.equal(result.wasUnitPence, null);
    assert.equal(result.savingPence, null);
    assert.equal(result.discountPercent, null);
  });

  it("the crossed-out price never falls below the live price", () => {
    const result = priceConfiguration(
      product,
      pick(
        {
          Size: "Super King 6FT",
          Storage: "4 Drawers",
          Headboard: '54" Floor Standing Headboard',
          Base: "Reinforced Base (holds 100 stone)",
        },
        { assembly: true },
      ),
    );
    assert.ok(result.wasUnitPence! > result.unitPence);
  });

  it("breakdown adds up to the unit price", () => {
    const result = priceConfiguration(
      product,
      pick(
        {
          Size: "Double 4FT6",
          Storage: "2 Drawers Left Side",
          Headboard: DEFAULTS.Headboard,
          Base: "Reinforced Base (holds 100 stone)",
        },
        { assembly: true },
      ),
    );
    const sum = result.breakdown.reduce((acc, row) => acc + row.pence, 0);
    assert.equal(sum, result.unitPence);
  });
});

describe("clampQuantity / discountPercentFor", () => {
  it("clamps to 1..10 and truncates", () => {
    assert.equal(clampQuantity(0), 1);
    assert.equal(clampQuantity(-4), 1);
    assert.equal(clampQuantity(3.9), 3);
    assert.equal(clampQuantity(99), 10);
    assert.equal(clampQuantity(Number.NaN), 1);
  });

  it("computes the headline discount", () => {
    assert.equal(discountPercentFor(26999, 53998), 50);
    assert.equal(discountPercentFor(7500, 10000), 25);
    assert.equal(discountPercentFor(10000, 10000), null);
    assert.equal(discountPercentFor(10000, null), null);
  });

  it("turns a percentage off into a compare-at price that shows the same badge", () => {
    assert.equal(compareAtForPercent(26999, 50), 53998); // the brief's £269.99 / £539.98
    assert.equal(compareAtForPercent(7500, 25), 10000);
    for (const base of [26999, 1999, 12345, 99999]) {
      for (let pct = 1; pct <= 95; pct++) {
        const was = compareAtForPercent(base, pct)!;
        assert.ok(was > base, `${pct}% on ${base} must be above the price`);
        assert.equal(discountPercentFor(base, was), pct, `${pct}% on ${base} -> ${was}`);
      }
    }
  });

  it("refuses percentages that make no sense", () => {
    for (const pct of [0, -5, 96, 100, 12.5, Number.NaN]) assert.equal(compareAtForPercent(26999, pct), null, String(pct));
    assert.equal(compareAtForPercent(0, 50), null);
  });
});
