"use client";

import { ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { cartCount, useCart } from "@/lib/cart/store";

/** Basket icon with a live count. Renders no count until the basket has loaded from storage. */
export function CartButton() {
  const hydrated = useCart((s) => s.hydrated);
  const count = useCart((s) => cartCount(s.lines));
  const show = hydrated && count > 0;
  return (
    <Link
      href="/cart"
      className="relative inline-flex size-11 items-center justify-center rounded-control transition-colors hover:bg-paper-deep"
      aria-label={show ? `Basket, ${count} item${count === 1 ? "" : "s"}` : "Basket, empty"}
    >
      <ShoppingBag className="size-[22px]" strokeWidth={1.6} />
      <AnimatePresence initial={false}>
        {show && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 520, damping: 22 }}
            className="tnum absolute right-0.5 top-0.5 grid min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[11px] font-semibold leading-[18px] text-white"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
