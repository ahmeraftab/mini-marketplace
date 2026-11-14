"use client";

import { useEffect, useMemo, useState } from "react";
import { refreshBasket } from "@/lib/orders/actions";
import type { ResolvedLine } from "@/lib/orders/resolve";
import { useCart, type CartLine } from "@/lib/cart/store";

export type LiveLine = {
  line: CartLine;
  /** Authoritative version from the database; undefined until the check returns. */
  live: ResolvedLine | undefined;
};

/**
 * Checks the stored basket against the database. Until the answer arrives the
 * stored snapshot is shown; afterwards prices and availability are the server's.
 */
export function useResolvedBasket() {
  const hydrated = useCart((s) => s.hydrated);
  const lines = useCart((s) => s.lines);
  const [results, setResults] = useState<Record<string, ResolvedLine>>({});
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);

  // only re-check when the SET of configurations or a quantity changes
  const signature = useMemo(() => lines.map((l) => `${l.key}#${l.quantity}`).join("|"), [lines]);

  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) return;
    let cancelled = false;
    refreshBasket(
      lines.map((l) => ({
        productId: l.productId,
        colourId: l.colourId,
        valueIds: l.valueIds,
        addonIds: l.addonIds,
        quantity: l.quantity,
      })),
    )
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setFailed(false);
          setResults(Object.fromEntries(res.data.map((r) => [r.key, r])));
          setChecked(true);
        } else {
          setFailed(true);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // `lines` content is captured by `signature`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, signature]);

  const items: LiveLine[] = lines.map((line) => ({ line, live: results[line.key] }));
  const unavailable = items.filter((i) => i.live && !i.live.ok);
  const total = items.reduce((n, { line, live }) => {
    if (live && !live.ok) return n;
    const unit = live && live.ok ? live.unitPence : line.unitPence;
    return n + unit * line.quantity;
  }, 0);

  return { hydrated, items, checked: checked || lines.length === 0, failed, unavailable, total, count: lines.reduce((n, l) => n + l.quantity, 0) };
}
