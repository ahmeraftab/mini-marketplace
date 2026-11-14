"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { OrderStatus } from "@/lib/orders/status";

const STEPS: Array<{ status: OrderStatus; label: string }> = [
  { status: "new", label: "New" },
  { status: "confirmed", label: "Confirmed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

/** Four steps; the rail fills up to the current status. Times come from the status log. */
export function OrderTimeline({
  status,
  events,
}: {
  status: OrderStatus;
  events: Array<{ status: OrderStatus; createdAt: string }>;
}) {
  const current = STEPS.findIndex((s) => s.status === status);
  const when = (s: OrderStatus) => {
    const hit = [...events].reverse().find((e) => e.status === s);
    return hit ? formatDateTime(hit.createdAt) : null;
  };
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i <= current;
        const time = done ? when(step.status) : null;
        return (
          <li key={step.status} className="relative text-center" aria-current={i === current ? "step" : undefined}>
            {i > 0 && (
              <span className="absolute right-1/2 top-4 h-0.5 w-full bg-line" aria-hidden="true">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-moss"
                  initial={{ width: 0 }}
                  animate={{ width: i <= current ? "100%" : 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            )}
            <span
              className={cn(
                "relative mx-auto grid size-8 place-items-center rounded-full border-2 text-xs font-semibold transition-colors duration-300",
                done ? "border-moss bg-moss text-white" : "border-line-strong bg-paper text-ink-muted",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <p className={cn("mt-2 text-sm", done ? "font-medium text-ink" : "text-ink-muted")}>{step.label}</p>
            {time && <p className="mt-0.5 hidden text-xs text-ink-muted sm:block">{time}</p>}
          </li>
        );
      })}
    </ol>
  );
}
