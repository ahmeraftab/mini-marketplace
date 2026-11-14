"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/** A text box for pounds: accepts 269.99, 269, £269.99 and 1,299.00. Parsed on save, not while typing. */
export const MoneyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function MoneyInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">£</span>
        <Input ref={ref} inputMode="decimal" autoComplete="off" className={cn("pl-8", className)} {...props} />
      </div>
    );
  },
);
