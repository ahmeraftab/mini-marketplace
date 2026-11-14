"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { newId } from "@/lib/ids";
import type { FormAddon, FormGroup } from "@/lib/seller/form-state";
import { MoneyInput } from "./money-input";

type GroupProps = {
  groups: FormGroup[];
  onChange: (groups: FormGroup[]) => void;
  errors: Record<string, string>;
};

const swap = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
  const t = i + dir;
  if (t < 0 || t >= list.length) return list;
  const next = [...list];
  [next[i], next[t]] = [next[t], next[i]];
  return next;
};

export function OptionGroupsEditor({ groups, onChange, errors }: GroupProps) {
  const patch = (gi: number, change: Partial<FormGroup>) =>
    onChange(groups.map((g, i) => (i === gi ? { ...g, ...change } : g)));

  return (
    <div>
      {groups.length === 0 && (
        <p className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-ink-muted">
          No option groups yet. Add one for Size, Storage, Headboard or anything else buyers choose between.
        </p>
      )}
      <ul className="space-y-5">
        {groups.map((g, gi) => (
          <li key={g.id} className="rounded-card border border-line bg-surface p-4" data-testid="group-row">
            <div className="flex items-end gap-2">
              <Field label="Group name" error={errors[`groups.${gi}.name`]} required className="flex-1">
                {(a) => (
                  <Input value={g.name} maxLength={60} placeholder="e.g. Size" onChange={(e) => patch(gi, { name: e.target.value })} {...a} />
                )}
              </Field>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={() => onChange(swap(groups, gi, -1))} disabled={gi === 0} aria-label={`Move ${g.name || "group"} earlier`} className="grid size-11 place-items-center rounded-control hover:bg-paper-deep disabled:opacity-35">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(swap(groups, gi, 1))} disabled={gi === groups.length - 1} aria-label={`Move ${g.name || "group"} later`} className="grid size-11 place-items-center rounded-control hover:bg-paper-deep disabled:opacity-35">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(groups.filter((x) => x.id !== g.id))} aria-label={`Remove ${g.name || "group"}`} className="grid size-11 place-items-center rounded-control text-ink-muted hover:bg-clay-soft hover:text-clay">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
              <input type="checkbox" checked={g.isFilterable} onChange={(e) => patch(gi, { isFilterable: e.target.checked })} className="size-5 accent-[var(--color-ink)]" />
              Use as a browse filter (buyers can filter the shop by this)
            </label>

            <ul className="mt-3 space-y-3">
              {g.values.map((v, vi) => (
                <li key={v.id} className="grid grid-cols-[1fr_7rem] items-start gap-2 sm:grid-cols-[1fr_9rem_auto]">
                  <Field label={vi === 0 ? "Choice" : ""} error={errors[`groups.${gi}.values.${vi}.label`]}>
                    {(a) => (
                      <Input aria-label={`Choice ${vi + 1} of ${g.name || "group"}`} value={v.label} maxLength={80} placeholder="e.g. King 5FT" onChange={(e) => patch(gi, { values: g.values.map((x) => (x.id === v.id ? { ...x, label: e.target.value } : x)) })} {...a} />
                    )}
                  </Field>
                  <Field label={vi === 0 ? "Extra cost" : ""} error={errors[`groups.${gi}.values.${vi}.price`]}>
                    {(a) => (
                      <MoneyInput aria-label={`Extra cost for choice ${vi + 1}`} value={v.price} placeholder="0" onChange={(e) => patch(gi, { values: g.values.map((x) => (x.id === v.id ? { ...x, price: e.target.value } : x)) })} {...a} />
                    )}
                  </Field>
                  <div className={vi === 0 ? "col-span-2 flex justify-end sm:col-span-1 sm:mt-[1.65rem]" : "col-span-2 flex justify-end sm:col-span-1"}>
                    <button
                      type="button"
                      onClick={() => patch(gi, { values: g.values.filter((x) => x.id !== v.id), defaultId: g.defaultId === v.id ? null : g.defaultId })}
                      aria-label={`Remove choice ${v.label || vi + 1}`}
                      className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted hover:text-clay"
                    >
                      <Trash2 className="size-4" /> <span className="sm:sr-only">Remove</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {errors[`groups.${gi}.values`] && <p role="alert" className="mt-2 text-sm font-medium text-clay">{errors[`groups.${gi}.values`]}</p>}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Button type="button" variant="secondary" size="sm" disabled={g.values.length >= 30} onClick={() => patch(gi, { values: [...g.values, { id: newId(), label: "", price: "" }] })}>
                <Plus className="size-4" /> Add a choice
              </Button>
              <div className="sm:w-64">
                <Field label="Chosen to start with">
                  {(a) => (
                    <Select value={g.defaultId ?? ""} onChange={(e) => patch(gi, { defaultId: e.target.value || null })} {...a}>
                      <option value="">None: the buyer must choose</option>
                      {g.values.filter((v) => v.label.trim()).map((v) => (
                        <option key={v.id} value={v.id}>{v.label}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {errors.groups && <p role="alert" className="mt-3 text-sm font-medium text-clay">{errors.groups}</p>}
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        disabled={groups.length >= 10}
        onClick={() => onChange([...groups, { id: newId(), name: "", isFilterable: false, defaultId: null, values: [{ id: newId(), label: "", price: "" }] }])}
      >
        <Plus className="size-4" /> Add an option group
      </Button>
    </div>
  );
}

export function AddonsEditor({
  addons,
  onChange,
  errors,
}: {
  addons: FormAddon[];
  onChange: (addons: FormAddon[]) => void;
  errors: Record<string, string>;
}) {
  return (
    <div>
      <ul className="space-y-3">
        {addons.map((a, i) => (
          <li key={a.id} className="grid grid-cols-[1fr_7rem] items-start gap-2 sm:grid-cols-[1fr_9rem_auto]">
            <Field label={i === 0 ? "Extra" : ""} error={errors[`addons.${i}.label`]}>
              {(f) => <Input aria-label={`Extra ${i + 1} name`} value={a.label} maxLength={80} placeholder="e.g. Professional Assembly" onChange={(e) => onChange(addons.map((x) => (x.id === a.id ? { ...x, label: e.target.value } : x)))} {...f} />}
            </Field>
            <Field label={i === 0 ? "Price" : ""} error={errors[`addons.${i}.price`]}>
              {(f) => <MoneyInput aria-label={`Extra ${i + 1} price`} value={a.price} placeholder="39.99" onChange={(e) => onChange(addons.map((x) => (x.id === a.id ? { ...x, price: e.target.value } : x)))} {...f} />}
            </Field>
            <div className={i === 0 ? "col-span-2 flex justify-end sm:col-span-1 sm:mt-[1.65rem]" : "col-span-2 flex justify-end sm:col-span-1"}>
              <button type="button" onClick={() => onChange(addons.filter((x) => x.id !== a.id))} aria-label={`Remove extra ${a.label || i + 1}`} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted hover:text-clay">
                <Trash2 className="size-4" /> <span className="sm:sr-only">Remove</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button type="button" variant="secondary" className="mt-4" disabled={addons.length >= 10} onClick={() => onChange([...addons, { id: newId(), label: "", price: "" }])}>
        <Plus className="size-4" /> Add an extra
      </Button>
    </div>
  );
}
