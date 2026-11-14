import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderItems } from "@/components/orders/order-items";
import { OrderTimeline } from "@/components/orders/timeline";
import { StatusControl } from "@/components/seller/status-control";
import { getSessionProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { formatPence } from "@/lib/money";
import { getOrder } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Order" };

export default async function SellerOrderPage(props: PageProps<"/seller/orders/[id]">) {
  const { id } = await props.params;
  const session = await getSessionProfile();
  if (!isUuid(id)) notFound();
  const order = await getOrder(id);
  if (!order || order.sellerId !== session!.id) notFound();

  return (
    <div>
      <Link href="/seller/orders" className="mb-5 inline-flex min-h-11 items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All orders
      </Link>
      <h2 className="font-display text-3xl" data-testid="order-number">{order.orderNumber}</h2>
      <p className="mt-1 text-ink-muted">Placed {formatDateTime(order.createdAt)}</p>

      <section className="mt-8 rounded-card border border-line bg-surface px-4 py-6 sm:px-8" aria-label="Progress">
        <OrderTimeline status={order.status} events={order.events} />
        <div className="mt-6 border-t border-line pt-5">
          <StatusControl orderId={order.id} status={order.status} />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="items">
        <h3 id="items" className="mb-4 font-display text-2xl">Items</h3>
        <OrderItems items={order.items} />
        <p className="mt-4 flex justify-between text-lg font-medium"><span>Total</span><span className="tnum font-display text-2xl">{formatPence(order.totalPence)}</span></p>
      </section>

      <section className="mt-10" aria-labelledby="ship">
        <h3 id="ship" className="mb-3 font-display text-2xl">Deliver to</h3>
        <address className="not-italic leading-relaxed text-ink-soft">
          {order.shipping.name}<br />{order.shipping.line1}<br />
          {order.shipping.line2 && <>{order.shipping.line2}<br /></>}
          {order.shipping.city} {order.shipping.postcode}<br />{order.shipping.phone}
        </address>
      </section>
    </div>
  );
}
