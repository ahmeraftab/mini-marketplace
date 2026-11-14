"use client";

import { Check } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/cn";
import { formatDelta } from "@/lib/money";
import type { OptionGroup } from "@/lib/catalog/types";

/**
 * One option group rendered as a column of tiles. Generic: the buyer page has
 * no idea what "Size" or "Storage" mean, it only draws what the seller entered.
 */
export function OptionGroupField({
  group,
  value,
  onChange,
  invalid,
}: {
  group: OptionGroup;
  value: string | null;
  onChange: (valueId: string) => void;
  invalid: boolean;
}) {
  const labelId = `group-${group.id}`;
  return (
    <fieldset id={`field-${group.id}`} className="scroll-mt-28">
      <div className="mb-3 flex items-baseline justify-between gap-3" id={labelId}>
        <legend className="float-left text-[15px] font-semibold">{group.name}:</legend>
        {invalid && (
          <p role="alert" className="text-sm font-medium text-clay">
            Please choose a {group.name.toLowerCase()}
          </p>
        )}
      </div>
      <RadioGroup.Root
        value={value ?? ""}
        onValueChange={onChange}
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        className={cn("clear-both grid gap-2 rounded-card", invalid && "ring-2 ring-clay/60 ring-offset-4 ring-offset-paper")}
      >
        {group.values.map((v) => {
          const selected = v.id === value;
          return (
            <RadioGroup.Item
              key={v.id}
              value={v.id}
              className={cn(
                "group flex min-h-12 w-full items-center gap-3 rounded-control border bg-surface px-4 py-2.5 text-left outline-none",
                "transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo",
                "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink/60",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border transition-colors duration-200",
                  selected ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface",
                )}
              >
                <Check className={cn("size-3 transition-[opacity,transform] duration-200", selected ? "scale-100 opacity-100" : "scale-50 opacity-0")} strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1 text-[15px] leading-snug">{v.label}</span>
              <span className={cn("tnum shrink-0 text-sm", v.priceDeltaPence === 0 ? "text-ink-muted" : "font-medium")}>
                {v.priceDeltaPence === 0 ? "No extra cost" : formatDelta(v.priceDeltaPence)}
              </span>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
    </fieldset>
  );
}
