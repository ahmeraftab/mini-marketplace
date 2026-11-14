"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import { formatPence } from "@/lib/money";

/**
 * A price whose digits roll to the new value. The visible digits are
 * decorative (aria-hidden); an adjacent live region announces the final value.
 * The first render already shows the exact value, so the server markup is right.
 */
export function RollingPrice({ pence, className }: { pence: number; className?: string }) {
  const reduce = useReducedMotion();
  const value = useMotionValue(pence);
  const text = useTransform(value, (v) => formatPence(Math.round(v)));

  useEffect(() => {
    if (reduce) {
      value.set(pence);
      return;
    }
    const controls = animate(value, pence, { duration: 0.5, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [pence, reduce, value]);

  return (
    <>
      <motion.span className={className} aria-hidden="true">
        {text}
      </motion.span>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {formatPence(pence)}
      </span>
    </>
  );
}
