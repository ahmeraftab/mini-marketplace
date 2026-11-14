"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_QUANTITY, clampQuantity } from "@/lib/pricing";

/**
 * One basket line = one exact configuration of a product. The ids drive
 * pricing and ordering; the display snapshot (titles, option labels, prices)
 * only makes the basket render instantly and is re-validated against the
 * database before checkout.
 */
export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  colourId: string;
  /** groupId -> chosen valueId */
  valueIds: Record<string, string>;
  addonIds: string[];
  quantity: number;
  // display snapshot
  title: string;
  colourName: string;
  colourHex: string;
  imagePath: string | null;
  shopName: string;
  options: Array<{ group: string; value: string; deltaPence: number }>;
  addons: Array<{ label: string; pricePence: number }>;
  unitPence: number;
  wasUnitPence: number | null;
};

type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  /** Returns the resulting quantity of the line. */
  add: (line: CartLine) => number;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  removeMany: (keys: string[]) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,
      add: (line) => {
        const existing = get().lines.find((l) => l.key === line.key);
        if (existing) {
          const quantity = Math.min(MAX_QUANTITY, existing.quantity + line.quantity);
          set({
            // refresh the snapshot so a re-added line shows current prices
            lines: get().lines.map((l) => (l.key === line.key ? { ...line, quantity } : l)),
          });
          return quantity;
        }
        const quantity = clampQuantity(line.quantity);
        set({ lines: [...get().lines, { ...line, quantity }] });
        return quantity;
      },
      setQuantity: (key, quantity) =>
        set({
          lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: clampQuantity(quantity) } : l)),
        }),
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      removeMany: (keys) => {
        const drop = new Set(keys);
        set({ lines: get().lines.filter((l) => !drop.has(l.key)) });
      },
      clear: () => set({ lines: [] }),
    }),
    {
      name: "mm-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // The server render has an empty basket, so the browser must not read
      // storage until after hydration (see CartHydrator). Prevents mismatches.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useCart.setState({ hydrated: true });
      },
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.unitPence * l.quantity, 0);
