"use client";

import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useResolvedBasket } from "@/components/cart/use-resolved-basket";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useCart } from "@/lib/cart/store";
import { newId } from "@/lib/ids";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import { placeOrder } from "@/lib/orders/actions";

export function CheckoutForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const { hydrated, items, unavailable, total, checked } = useResolvedBasket();
  const removeMany = useCart((s) => s.removeMany);
  const lines = useCart((s) => s.lines);
  // one id per visit to this page: a double tap or a retry can never create a second order
  const checkoutId = useRef(newId());
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!hydrated || done) return <div className="skeleton h-96 rounded-card" aria-hidden="true" />;

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
        <h2 className="font-display text-2xl">Your basket is empty</h2>
        <Button asChild className="mt-6"><Link href="/products">Shop beds</Link></Button>
      </div>
    );
  }

  const blocked = unavailable.length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || blocked) return;
    submitting.current = true;
    setPending(true);
    setErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    try {
      const res = await placeOrder({
        checkoutId: checkoutId.current,
        displayedTotalPence: total,
        lines: lines.map((l) => ({
          productId: l.productId,
          colourId: l.colourId,
          valueIds: l.valueIds,
          addonIds: l.addonIds,
          quantity: l.quantity,
        })),
        shipping: {
          name: get("name"),
          phone: get("phone"),
          line1: get("line1"),
          line2: get("line2"),
          city: get("city"),
          postcode: get("postcode"),
        },
      });
      if (res.ok) {
        setDone(true);
        removeMany(res.data.keys);
        const ids = res.data.orders.map((o) => o.orderNumber).join(",");
        router.push(`/checkout/success?orders=${encodeURIComponent(ids)}`);
        return; // keep the button disabled while navigating
      }
      if (res.code === "NOT_SIGNED_IN") {
        router.push("/login?next=/checkout");
        return;
      }
      setErrors(res.fieldErrors ?? {});
      setFormError(res.message);
      if (res.code === "PRICE_CHANGED" || res.code === "ITEM_UNAVAILABLE") {
        toast.error(res.message);
        router.push("/cart");
        return;
      }
    } catch {
      setFormError("We could not reach the server. Check your connection and try again.");
    }
    submitting.current = false;
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
      <div className="min-w-0 space-y-10">
        <section aria-labelledby="delivery">
          <h2 id="delivery" className="font-display text-2xl">Delivery</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name} required className="sm:col-span-2">
              {(a) => <Input name="name" autoComplete="name" defaultValue={defaultName} required {...a} />}
            </Field>
            <Field label="Phone" error={errors.phone} required className="sm:col-span-2">
              {(a) => <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" required {...a} />}
            </Field>
            <Field label="Address" error={errors.line1} required className="sm:col-span-2">
              {(a) => <Input name="line1" autoComplete="address-line1" required {...a} />}
            </Field>
            <Field label="Address line 2" error={errors.line2} className="sm:col-span-2">
              {(a) => <Input name="line2" autoComplete="address-line2" {...a} />}
            </Field>
            <Field label="Town or city" error={errors.city} required>
              {(a) => <Input name="city" autoComplete="address-level2" required {...a} />}
            </Field>
            <Field label="Postcode" error={errors.postcode} required>
              {(a) => <Input name="postcode" autoComplete="postal-code" autoCapitalize="characters" required {...a} />}
            </Field>
          </div>
        </section>

        <section aria-labelledby="payment">
          <h2 id="payment" className="font-display text-2xl">Payment</h2>
          <div className="mt-5 flex gap-3 rounded-card border border-line bg-paper-deep/60 p-4 text-[15px]">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-moss" strokeWidth={1.6} />
            <p>This is a demo. No payment is taken and no card details are asked for. Placing the order simply sends it to the seller.</p>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Order summary">
        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="font-display text-xl">Your order</h2>
          <ul className="mt-5 space-y-4">
            {items.map(({ line, live }) => {
              const ok = live && live.ok ? live : null;
              const gone = live && !live.ok;
              const unit = ok ? ok.unitPence : line.unitPence;
              return (
                <li key={line.key} className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep">
                    {line.imagePath && <Image src={imageUrl(line.imagePath)} alt="" fill sizes="64px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium leading-snug">{line.title}</p>
                    <p className="text-ink-muted">
                      {line.options.map((o) => o.value).join(" · ")}
                      {line.addons.length ? ` · ${line.addons.map((a) => a.label).join(", ")}` : ""}
                    </p>
                    {gone ? <p className="font-medium text-clay">No longer available</p> : <p className="tnum text-ink-muted">Qty {line.quantity}</p>}
                  </div>
                  <p className="tnum text-sm font-medium">{gone ? "—" : formatPence(unit * line.quantity)}</p>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-lg font-medium">Total</span>
            <span className="tnum font-display text-2xl" data-testid="checkout-total">{formatPence(total)}</span>
          </div>
          {formError && <p role="alert" className="mt-4 rounded-control bg-clay-soft px-3.5 py-3 text-sm text-clay-deep">{formError}</p>}
          {blocked && <p role="alert" className="mt-4 text-sm text-clay">Remove unavailable items from your <Link href="/cart" className="underline">basket</Link> first.</p>}
          <div className="mt-5 hidden lg:block">
            <Button type="submit" size="lg" className="w-full" loading={pending} disabled={blocked || !checked} data-testid="place-order">
              Place order · {formatPence(total)}
            </Button>
          </div>
        </div>
      </aside>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper shadow-[0_-8px_24px_-16px_rgb(27_26_23/0.35)] lg:hidden">
        <div className="px-4 py-3 sm:px-6">
          <Button type="submit" size="lg" className="w-full" loading={pending} disabled={blocked || !checked} data-testid="place-order-mobile">
            Place order · {formatPence(total)}
          </Button>
        </div>
      </div>
    </form>
  );
}
