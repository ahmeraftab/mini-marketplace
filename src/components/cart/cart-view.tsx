"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/store";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import { MAX_QUANTITY } from "@/lib/pricing";
import { useResolvedBasket } from "./use-resolved-basket";

export function CartView() {
  const { hydrated, items, checked, failed, unavailable, total, count } = useResolvedBasket();
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);

  if (!hydrated) return <CartSkeleton />;

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-6 py-20 text-center">
        <h2 className="font-display text-2xl">Your basket is empty</h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-muted">Pick a fabric and size and it will wait for you here.</p>
        <Button asChild className="mt-6" size="lg">
          <Link href="/products">Shop beds</Link>
        </Button>
      </div>
    );
  }

  const blocked = unavailable.length > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
      <div className="min-w-0">
        {failed && (
          <p role="status" className="mb-4 rounded-control border border-amber-ink/20 bg-amber-soft px-4 py-3 text-sm text-amber-ink">
            We could not refresh your prices just now. They will be checked again at checkout.
          </p>
        )}
        <ul className="divide-y divide-line border-y border-line">
          <AnimatePresence initial={false}>
            {items.map(({ line, live }) => {
              const gone = live && !live.ok;
              const ok = live && live.ok ? live : null;
              const unit = ok ? ok.unitPence : line.unitPence;
              const changed = ok && ok.unitPence !== line.unitPence;
              const options = ok ? ok.options : line.options;
              const addons = ok ? ok.addons : line.addons;
              return (
                <motion.li
                  key={line.key}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                  data-testid="cart-line"
                >
                  <div className="flex gap-4 py-6">
                    <Link href={`/products/${line.slug}?colour=${encodeURIComponent(line.colourName.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}`} className="relative size-24 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep sm:size-32">
                      {line.imagePath && <Image src={imageUrl(line.imagePath)} alt="" fill sizes="128px" className={gone ? "object-cover opacity-40" : "object-cover"} />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-lg leading-snug">{line.title}</h3>
                        <p className="tnum shrink-0 font-medium">{gone ? "—" : formatPence(unit * line.quantity)}</p>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
                        <li className="flex items-center gap-2">
                          Colour: {line.colourName}
                          <span className="inline-block size-3 rounded-full border border-black/15" style={{ backgroundColor: line.colourHex }} aria-hidden="true" />
                        </li>
                        {options.map((o) => (
                          <li key={o.group}>
                            {o.group}: {o.value}
                            {o.deltaPence > 0 && <span className="tnum"> (+{formatPence(o.deltaPence)})</span>}
                          </li>
                        ))}
                        {addons.map((a) => (
                          <li key={a.label}>
                            {a.label} <span className="tnum">(+{formatPence(a.pricePence)})</span>
                          </li>
                        ))}
                      </ul>
                      {gone && live && !live.ok && (
                        <p role="alert" className="mt-2 text-sm font-medium text-clay">
                          No longer available: {live.reason} Remove it to continue.
                        </p>
                      )}
                      {changed && <p className="mt-2 text-sm text-amber-ink">Price updated to {formatPence(unit)} each since you added this.</p>}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-control border border-line-strong bg-surface" role="group" aria-label={`Quantity for ${line.title}`}>
                          <button type="button" className="grid size-11 place-items-center hover:bg-paper-deep disabled:opacity-35" onClick={() => setQuantity(line.key, line.quantity - 1)} disabled={line.quantity <= 1 || !!gone} aria-label="Decrease quantity">
                            <Minus className="size-4" />
                          </button>
                          <output className="tnum w-9 text-center text-[15px] font-medium" aria-live="polite">{line.quantity}</output>
                          <button type="button" className="grid size-11 place-items-center hover:bg-paper-deep disabled:opacity-35" onClick={() => setQuantity(line.key, line.quantity + 1)} disabled={line.quantity >= MAX_QUANTITY || !!gone} aria-label="Increase quantity">
                            <Plus className="size-4" />
                          </button>
                        </div>
                        <button type="button" onClick={() => remove(line.key)} className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted underline-offset-4 hover:text-clay hover:underline">
                          <Trash2 className="size-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Summary</h2>
          <dl className="mt-5 space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-muted">Items</dt><dd className="tnum">{count}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">Delivery</dt><dd>Free (demo)</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-lg font-medium"><dt>Total</dt><dd className="tnum font-display text-2xl" data-testid="cart-total">{formatPence(total)}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-ink-muted">Demo checkout: no payment is taken.</p>
          <div className="mt-5 hidden lg:block">
            <CheckoutButton blocked={blocked} checked={checked} />
          </div>
        </div>
      </aside>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper shadow-[0_-8px_24px_-16px_rgb(27_26_23/0.35)] lg:hidden">
        <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
          <div className="leading-tight">
            <p className="text-xs text-ink-muted">Total</p>
            <p className="tnum font-display text-xl font-medium">{formatPence(total)}</p>
          </div>
          <div className="flex-1"><CheckoutButton blocked={blocked} checked={checked} /></div>
        </div>
      </div>
    </div>
  );
}

function CheckoutButton({ blocked, checked }: { blocked: boolean; checked: boolean }) {
  if (blocked) {
    return <Button size="lg" className="w-full" disabled>Remove unavailable items</Button>;
  }
  return (
    <Button asChild size="lg" className="w-full" aria-disabled={!checked}>
      <Link href="/checkout">Checkout</Link>
    </Button>
  );
}

function CartSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-4">
          <div className="skeleton size-28 rounded-[3px]" />
          <div className="flex-1 space-y-3 pt-1">
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
