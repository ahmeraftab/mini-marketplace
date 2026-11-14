import Image from "next/image";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import type { OrderItem } from "@/lib/orders/queries";

/** Items exactly as they were ordered: every option, add-on and price is a snapshot. */
export function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <li key={item.id} className="flex gap-4 py-5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep sm:size-24">
            {item.imagePath && <Image src={imageUrl(item.imagePath)} alt="" fill sizes="96px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between gap-3">
              <p className="font-display text-lg leading-snug">{item.title}</p>
              <p className="tnum shrink-0 font-medium">{formatPence(item.lineTotalPence)}</p>
            </div>
            <ul className="mt-1.5 space-y-0.5 text-sm text-ink-muted">
              <li>Colour: {item.colourName}</li>
              {item.options.map((o) => (
                <li key={o.group}>
                  {o.group}: {o.value}
                </li>
              ))}
              {item.addons.map((a) => (
                <li key={a.label}>{a.label}</li>
              ))}
            </ul>
            <p className="tnum mt-2 text-sm">
              {item.quantity} × {formatPence(item.unitPricePence)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
