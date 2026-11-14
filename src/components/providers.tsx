"use client";

import { MotionConfig } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { useCart } from "@/lib/cart/store";

/**
 * Loads the basket from localStorage AFTER hydration (never during render, so
 * the server and first client render always match), and keeps several open
 * tabs in step through the `storage` event.
 */
function CartHydrator() {
  useEffect(() => {
    const load = async () => {
      try {
        await useCart.persist.rehydrate();
      } catch {
        // storage blocked (private window): carry on with an in-memory basket
      } finally {
        useCart.setState({ hydrated: true });
      }
    };
    void load();

    const onStorage = (event: StorageEvent) => {
      if (event.key === "mm-cart-v1") void useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <CartHydrator />
      {children}
      <Toaster
        position="top-center"
        offset={{ top: 76 }}
        mobileOffset={{ top: 72 }}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-card !border !border-line !bg-surface !text-ink !shadow-overlay !font-sans !text-[15px]",
            description: "!text-ink-muted",
          },
        }}
      />
    </MotionConfig>
  );
}
