"use client";

import Image from "next/image";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import { cartCount, cartTotal, type CartLine } from "@/lib/cart/store";

/** Opens after Add to Basket: shows the line just added with every chosen option. */
export function MiniBasket({
  open,
  onOpenChange,
  line,
  lines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  line: CartLine | null;
  lines: CartLine[];
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Added to your basket"
      description={`${cartCount(lines)} ${cartCount(lines) === 1 ? "item" : "items"} · ${formatPence(cartTotal(lines))}`}
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary" size="lg">
            <Link href="/cart">View basket</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/checkout">Checkout</Link>
          </Button>
        </div>
      }
    >
      {line && (
        <div className="flex gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep">
            {line.imagePath && (
              <Image src={imageUrl(line.imagePath)} alt="" fill sizes="96px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-snug">{line.title}</p>
            <ul className="mt-2 space-y-0.5 text-sm text-ink-muted">
              <li>Colour: {line.colourName}</li>
              {line.options.map((o) => (
                <li key={o.group}>
                  {o.group}: {o.value}
                </li>
              ))}
              {line.addons.map((a) => (
                <li key={a.label}>{a.label}</li>
              ))}
            </ul>
            <p className="tnum mt-3 text-[15px] font-medium">
              {line.quantity} × {formatPence(line.unitPence)}
            </p>
          </div>
        </div>
      )}
    </Sheet>
  );
}
