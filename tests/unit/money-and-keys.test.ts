import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { configurationKey } from "../../src/lib/cart/key";
import { safeNextPath, slugify } from "../../src/lib/format";
import { isUuid, newId } from "../../src/lib/ids";
import {
  formatDelta,
  formatPence,
  parsePounds,
  penceToInput,
} from "../../src/lib/money";

describe("formatPence / formatDelta / penceToInput", () => {
  it("formats pence as pounds with grouping", () => {
    assert.equal(formatPence(26999), "£269.99");
    assert.equal(formatPence(117996), "£1,179.96");
    assert.equal(formatPence(5), "£0.05");
    assert.equal(formatPence(0), "£0.00");
    assert.equal(formatPence(100_000_000), "£1,000,000.00");
  });

  it("formats option deltas", () => {
    assert.equal(formatDelta(9000), "+£90.00");
    assert.equal(formatDelta(3999), "+£39.99");
    assert.equal(formatDelta(0), "No extra cost");
  });

  it("round-trips through the input box", () => {
    assert.equal(penceToInput(26999), "269.99");
    assert.equal(penceToInput(9000), "90.00");
    assert.equal(parsePounds(penceToInput(53998)), 53998);
  });
});

describe("parsePounds", () => {
  const accepted: Array<[string, number]> = [
    ["269.99", 26999],
    ["269.9", 26990],
    ["269", 26900],
    ["£269.99", 26999],
    ["£ 269.99", 26999],
    ["  1,299.00 ", 129900],
    ["0.05", 5],
    ["0", 0],
  ];
  for (const [input, expected] of accepted) {
    it(`accepts "${input}"`, () => assert.equal(parsePounds(input), expected));
  }

  const rejected = ["", "abc", "-1", "-0.50", "269.999", "12,34", ".99", "1e3", "£", "10..5", "99999999999999"];
  for (const input of rejected) {
    it(`rejects "${input}"`, () => assert.equal(parsePounds(input), null));
  }

  it("does not suffer from floating point (19.99 and 1.15)", () => {
    assert.equal(parsePounds("19.99"), 1999);
    assert.equal(parsePounds("1.15"), 115);
    assert.equal(parsePounds("0.29"), 29);
  });
});

describe("configurationKey", () => {
  const base = { productId: "p", colourId: "c" };

  it("is independent of the order options were chosen in", () => {
    const a = configurationKey({ ...base, valueIds: ["v1", "v2", "v3"], addonIds: ["a1"] });
    const b = configurationKey({ ...base, valueIds: ["v3", "v1", "v2"], addonIds: ["a1"] });
    assert.equal(a, b);
  });

  it("differs when any option, colour or add-on differs", () => {
    const ref = configurationKey({ ...base, valueIds: ["v1", "v2"], addonIds: [] });
    assert.notEqual(ref, configurationKey({ ...base, valueIds: ["v1", "v9"], addonIds: [] }));
    assert.notEqual(ref, configurationKey({ ...base, colourId: "c2", valueIds: ["v1", "v2"], addonIds: [] }));
    assert.notEqual(ref, configurationKey({ ...base, valueIds: ["v1", "v2"], addonIds: ["a1"] }));
  });
});

describe("ids / slugs / redirects", () => {
  it("generates valid, unique uuids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newId()));
    assert.equal(ids.size, 200);
    for (const id of ids) assert.equal(isUuid(id), true);
    assert.equal(isUuid("not-a-uuid"), false);
  });

  it("slugifies the en dash title", () => {
    assert.equal(
      slugify("Prague Divan Bed – Cream Naples"),
      "prague-divan-bed-cream-naples",
    );
    assert.equal(slugify('  54" Headboard!! '), "54-headboard");
  });

  it("only allows same-site redirect paths", () => {
    assert.equal(safeNextPath("/checkout"), "/checkout");
    assert.equal(safeNextPath("/orders?x=1"), "/orders?x=1");
    assert.equal(safeNextPath("//evil.com"), "/");
    assert.equal(safeNextPath("https://evil.com"), "/");
    assert.equal(safeNextPath("/\\evil.com"), "/");
    assert.equal(safeNextPath("javascript:alert(1)"), "/");
    assert.equal(safeNextPath(null), "/");
    assert.equal(safeNextPath(undefined, "/seller"), "/seller");
  });
});
