import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { getSessionProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";
import { listOrders } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Your orders" };

export default async function OrdersPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/orders");
  if (session.role === "seller") redirect("/seller/orders");
  if (session.role === "admin") redirect("/admin");

  const orders = await listOrders();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <h1 className="mb-8 font-display text-4xl tracking-tight sm:text-5xl">Your orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
          <h2 className="font-display text-2xl">No orders yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-ink-muted">When you place an order it will appear here, and you can follow it to your door.</p>
          <Button asChild className="mt-6"><Link href="/products">Shop beds</Link></Button>
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className="block rounded-card border border-line bg-surface p-5 transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-ink"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-xl" data-testid="order-number">{o.orderNumber}</p>
                    <p className="text-sm text-ink-muted">{formatDate(o.createdAt)} · {o.shopName}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <p className="tnum font-medium">{formatPence(o.totalPence)}</p>
                  </div>
                </div>
                <ul className="mt-4 flex gap-2">
                  {o.items.slice(0, 4).map((i) => (
                    <li key={i.id} className="relative size-14 overflow-hidden rounded-[3px] bg-paper-deep">
                      {i.imagePath && <Image src={imageUrl(i.imagePath)} alt="" fill sizes="56px" className="object-cover" />}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
