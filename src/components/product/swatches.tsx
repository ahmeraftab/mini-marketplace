"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { RadioGroup } from "radix-ui";
import { cn } from "@/lib/cn";
import { luminanceOf } from "@/lib/color";
import type { Colour } from "@/lib/catalog/types";

/**
 * Fabric swatches, shown above every other option. Each is a radio (arrow keys
 * move between them) with a clear selected ring, and the chosen colour's name
 * appears beside the "Colour:" label.
 */
export function Swatches({
  colours,
  value,
  onChange,
}: {
  colours: Colour[];
  value: string;
  onChange: (colourId: string) => void;
}) {
  const selected = colours.find((c) => c.id === value) ?? colours[0];
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-2" id="colour-label">
        <span className="text-[15px] font-semibold">Colour:</span>
        <span className="relative inline-flex min-h-6 items-baseline overflow-hidden text-[15px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={selected.id}
              data-testid="colour-name"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="block text-ink-soft"
            >
              {selected.name}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      <RadioGroup.Root
        value={selected.id}
        onValueChange={onChange}
        aria-labelledby="colour-label"
        className="flex flex-wrap gap-2.5"
      >
        {colours.map((colour) => {
          const isSelected = colour.id === selected.id;
          const onDark = luminanceOf(colour.hex) < 0.55;
          return (
            <RadioGroup.Item
              key={colour.id}
              value={colour.id}
              aria-label={colour.name}
              title={colour.name}
              className={cn(
                "group relative grid size-12 place-items-center rounded-[10px] outline-none transition-transform duration-200 ease-out-expo",
                "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
              )}
            >
              {/* the fabric chip */}
              <span
                className="absolute inset-0 rounded-[10px] border border-black/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.35),inset_0_-8px_14px_rgb(0_0_0/0.08)]"
                style={{ backgroundColor: colour.hex }}
              />
              {/* selected ring, drawn outside the chip */}
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="pointer-events-none absolute -inset-[5px] rounded-[14px] border-2 border-ink"
              />
              <RadioGroup.Indicator forceMount asChild>
                <motion.span
                  initial={false}
                  animate={{ scale: isSelected ? 1 : 0, opacity: isSelected ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 28 }}
                  className="relative"
                >
                  <Check className={cn("size-5", onDark ? "text-white" : "text-ink")} strokeWidth={2.6} />
                </motion.span>
              </RadioGroup.Indicator>
            </RadioGroup.Item>
          );
        })}
      </RadioGroup.Root>
    </div>
  );
}
