"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { newId } from "@/lib/ids";
import { suggestTitle, type FormColour } from "@/lib/seller/form-state";

type Props = {
  colours: FormColour[];
  onChange: (colours: FormColour[]) => void;
  errors: Record<string, string>;
  groupError?: string;
};

export function ColoursEditor({ colours, onChange, errors, groupError }: Props) {
  const main = colours[0];

  const patch = (index: number, change: Partial<FormColour>) =>
    onChange(
      colours.map((c, i) => {
        if (i !== index) return c;
        const next = { ...c, ...change };
        // keep the suggested title in step with the name until the seller edits it
        if (change.name !== undefined && !c.titleEdited && i > 0 && main) {
          next.title = suggestTitle(main.title, main.name, change.name);
        }
        return next;
      }),
    );

  const renameMain = (name: string) => {
    onChange(
      colours.map((c, i) => {
        if (i === 0) return { ...c, name };
        // other colours that still use the generated title follow a change of the main title
        return c;
      }),
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    const t = index + dir;
    if (t < 0 || t >= colours.length) return;
    const next = [...colours];
    [next[index], next[t]] = [next[t], next[index]];
    onChange(next);
  };

  return (
    <div>
      <ul className="space-y-4">
        {colours.map((c, i) => (
          <li key={c.id} className="rounded-card border border-line bg-surface p-4" data-testid="colour-row">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{i === 0 ? "Main colour" : `Colour ${i + 1}`}</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.name || "colour"} earlier`} className="grid size-11 place-items-center rounded-control hover:bg-paper-deep disabled:opacity-35">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === colours.length - 1} aria-label={`Move ${c.name || "colour"} later`} className="grid size-11 place-items-center rounded-control hover:bg-paper-deep disabled:opacity-35">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(colours.filter((x) => x.id !== c.id))} disabled={colours.length === 1} aria-label={`Remove ${c.name || "colour"}`} className="grid size-11 place-items-center rounded-control text-ink-muted hover:bg-clay-soft hover:text-clay disabled:opacity-35">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_9.5rem]">
              <Field label="Colour name" error={errors[`colours.${i}.name`]} required>
                {(a) => (
                  <Input
                    value={c.name}
                    maxLength={60}
                    placeholder="e.g. Cream Naples"
                    onChange={(e) => (i === 0 ? renameMain(e.target.value) : patch(i, { name: e.target.value }))}
                    {...a}
                  />
                )}
              </Field>
              <Field label="Swatch colour" error={errors[`colours.${i}.hex`]}>
                {(a) => (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#cccccc"}
                      onChange={(e) => patch(i, { hex: e.target.value.toUpperCase() })}
                      aria-label={`Pick swatch colour for ${c.name || "colour"}`}
                      className="size-11 shrink-0 cursor-pointer rounded-control border border-line-strong bg-surface p-1"
                    />
                    <Input value={c.hex} maxLength={7} onChange={(e) => patch(i, { hex: e.target.value })} className="font-mono text-sm uppercase" {...a} />
                  </div>
                )}
              </Field>
              <Field
                className="sm:col-span-2"
                label={i === 0 ? "Product title" : "Title when this colour is selected"}
                hint={i === 0 ? "This is the main listing title." : "Suggested from the main title; edit it if you like."}
                error={errors[`colours.${i}.title`]}
                required
              >
                {(a) => (
                  <Input
                    value={c.title}
                    maxLength={140}
                    placeholder="e.g. Prague Divan Bed – Cream Naples"
                    onChange={(e) => patch(i, { title: e.target.value, titleEdited: true })}
                    {...a}
                  />
                )}
              </Field>
            </div>
          </li>
        ))}
      </ul>
      {groupError && <p role="alert" className="mt-3 text-sm font-medium text-clay">{groupError}</p>}
      <Button
        type="button"
        variant="secondary"
        className="mt-4"
        disabled={colours.length >= 20}
        onClick={() => onChange([...colours, { id: newId(), name: "", hex: "#CCCCCC", title: "", titleEdited: false }])}
      >
        <Plus className="size-4" /> Add a colour
      </Button>
    </div>
  );
}
