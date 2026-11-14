import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPraguePayload } from "../../src/lib/demo/prague-payload";
import { newId } from "../../src/lib/ids";
import { buildPayload, emptyForm, suggestTitle, submissionProblems, type FormState } from "../../src/lib/seller/form-state";
import { saveProductSchema } from "../../src/lib/seller/payload-schema";

const seller = newId();
const category = newId();

function pragueForm(): FormState {
  const p = buildPraguePayload({ sellerId: seller, categoryId: category, newId });
  return {
    id: p.id,
    isNew: true,
    status: "draft",
    categoryId: category,
    description: p.description,
    basePrice: "269.99",
    compareAt: "539.98",
    colours: p.colours.map((c) => ({ ...c, titleEdited: true })),
    photos: p.images.map((i) => ({ id: i.id, colourId: i.colour_id, path: i.storage_path, alt: i.alt, width: i.width, height: i.height })),
    groups: p.groups.map((g) => ({
      id: g.id,
      name: g.name,
      isFilterable: g.is_filterable,
      defaultId: g.values.find((v) => v.is_default)?.id ?? null,
      values: g.values.map((v) => ({ id: v.id, label: v.label, price: (v.price_delta_pence / 100).toFixed(2) })),
    })),
    addons: p.addons.map((a) => ({ id: a.id, label: a.label, price: (a.price_pence / 100).toFixed(2) })),
  };
}

describe("seller form", () => {
  it("builds a valid payload for the Prague bed in integer pence", () => {
    const r = buildPayload(pragueForm(), true);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.payload.base_price_pence, 26999);
      assert.equal(r.payload.compare_at_price_pence, 53998);
      assert.equal(r.payload.groups[0].values[0].price_delta_pence, 9000);
      assert.ok(saveProductSchema.safeParse(r.payload).success);
    }
  });

  it("accepts pound formats and rejects bad ones", () => {
    for (const ok of ["269.99", "£269.99", "1,299.00", "269"]) {
      const f = { ...pragueForm(), basePrice: ok, compareAt: "5000" };
      assert.equal(buildPayload(f, false).ok, true, ok);
    }
    for (const bad of ["", "-5", "269.999", "abc"]) {
      const r = buildPayload({ ...pragueForm(), basePrice: bad }, false);
      assert.equal(r.ok, false, bad);
      if (!r.ok) assert.ok(r.errors.basePrice);
    }
  });

  it("requires compare-at to exceed the price", () => {
    const r = buildPayload({ ...pragueForm(), compareAt: "100" }, false);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.errors.compareAt);
  });

  it("maps nested errors to field keys", () => {
    const f = pragueForm();
    f.groups[0].values[1].label = "";
    f.colours[1].hex = "red";
    const r = buildPayload(f, false);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.ok(r.errors["groups.0.values.1.label"]);
      assert.ok(r.errors["colours.1.hex"]);
    }
  });

  it("rejects duplicate colour names and two defaults", () => {
    const f = pragueForm();
    f.colours[1].name = f.colours[0].name;
    assert.equal(buildPayload(f, false).ok, false);
  });

  it("suggests colour titles from the main title", () => {
    assert.equal(
      suggestTitle("Prague Divan Bed – Cream Naples", "Cream Naples", "Mink Naples"),
      "Prague Divan Bed – Mink Naples",
    );
    assert.equal(suggestTitle("", "", "Pink"), "Pink");
  });

  it("asks for 5 photos before submitting", () => {
    const f = emptyForm(category);
    assert.ok(submissionProblems(f).length >= 2);
    assert.equal(submissionProblems(pragueForm()).length, 0);
  });
});
