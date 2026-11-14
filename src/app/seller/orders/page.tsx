import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { formatPence } from "@/lib/money";
import { listOrders } from "@/lib/orders/queries";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Incoming orders" };

export default async function SellerOrders(props: PageProps<"/seller/orders">) {
  const raw = (await props.searchParams).status;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const status = ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : undefined;
  const orders = await listOrders({ status });

  return (
    <div>
      <h2 className="mb-5 font-display text-2xl">Incoming orders</h2>
      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
        {[{ href: "/seller/orders", label: "All", on: !status }, ...ORDER_STATUSES.map((s) => ({ href: `/seller/orders?status=${s}`, label: STATUS_LABEL[s], on: status === s }))].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.on ? "true" : undefined}
            className={cn("inline-flex min-h-11 items-center rounded-full border px-4 text-sm", t.on ? "border-ink bg-ink text-paper" : "border-line-strong bg-surface hover:border-ink")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-ink-muted">No orders here yet.</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/seller/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-5 hover:border-ink" data-testid="seller-order">
                <div>
                  <p className="font-display text-xl">{o.orderNumber}</p>
                  <p className="text-sm text-ink-muted">{formatDate(o.createdAt)} · {o.shipping.name} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s)</p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <p className="tnum font-medium">{formatPence(o.totalPence)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
