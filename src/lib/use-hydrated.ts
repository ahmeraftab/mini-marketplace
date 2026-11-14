"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during the server render and the first client render, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
