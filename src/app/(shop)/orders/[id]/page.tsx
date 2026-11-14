import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OrderItems } from "@/components/orders/order-items";
import { OrderTimeline } from "@/components/orders/timeline";
import { StatusBadge } from "@/components/ui/badge";
import { getSessionProfile } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { formatPence } from "@/lib/money";
import { getOrder } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const session = await getSessionProfile();
  if (!session) redirect(`/login?next=/orders/${id}`);
  if (!isUuid(id)) notFound();
  const order = await getOrder(id);
  // RLS only returns this buyer's own order; anything else is simply "not found"
  if (!order || order.buyerId !== session.id) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:pt-10">
      <Link href="/orders" className="mb-5 inline-flex min-h-11 items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="size-4" /> All orders
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-tight" data-testid="order-number">{order.orderNumber}</h1>
          <p className="mt-1 text-ink-muted">Placed {formatDateTime(order.createdAt)} · Sold by {order.shopName}</p>
        </div>
        <div data-testid="order-status"><StatusBadge status={order.status} /></div>
      </div>

      <section className="mt-10 rounded-card border border-line bg-surface px-4 py-6 sm:px-8" aria-label="Progress">
        <OrderTimeline status={order.status} events={order.events} />
      </section>

      <section className="mt-10" aria-labelledby="items">
        <h2 id="items" className="mb-4 font-display text-2xl">Items</h2>
        <OrderItems items={order.items} />
        <p className="mt-4 flex justify-between text-lg font-medium">
          <span>Total</span>
          <span className="tnum font-display text-2xl">{formatPence(order.totalPence)}</span>
        </p>
      </section>

      <section className="mt-10" aria-labelledby="delivery">
        <h2 id="delivery" className="mb-3 font-display text-2xl">Delivery address</h2>
        <address className="not-italic leading-relaxed text-ink-soft">
          {order.shipping.name}<br />
          {order.shipping.line1}<br />
          {order.shipping.line2 && <>{order.shipping.line2}<br /></>}
          {order.shipping.city} {order.shipping.postcode}<br />
          {order.shipping.phone}
        </address>
      </section>
    </div>
  );
}
