"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/sheet";
import { setListingStatus, setSellerStatus } from "@/lib/admin/actions";
import type { AdminListing, AdminSeller } from "@/lib/admin/queries";
import { formatDate } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";

type Pending = { kind: "seller" | "listing"; id: string; name: string } | null;

export function Moderation({ sellers, listings }: { sellers: AdminSeller[]; listings: AdminListing[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending>(null);

  async function run(kind: "seller" | "listing", id: string, status: string) {
    setBusy(id);
    const res = await (kind === "seller" ? setSellerStatus({ id, status }) : setListingStatus({ id, status })).catch(() => null);
    setBusy(null);
    if (res?.ok) {
      toast.success(status === "hidden" ? "Hidden" : "Approved");
      router.refresh();
    } else {
      toast.error(res && !res.ok ? res.message : "That did not work. Please try again.");
    }
  }

  const actions = (kind: "seller" | "listing", id: string, name: string, status: string) => (
    <div className="flex items-center gap-2">
      {status !== "approved" && (
        <Button size="sm" loading={busy === id} onClick={() => void run(kind, id, "approved")} data-testid={`approve-${kind}`}>Approve</Button>
      )}
      {status !== "hidden" && (
        <Button size="sm" variant="secondary" disabled={busy === id} onClick={() => setConfirm({ kind, id, name })} data-testid={`hide-${kind}`}>Hide</Button>
      )}
    </div>
  );

  return (
    <div className="space-y-14">
      <section aria-labelledby="sellers">
        <h2 id="sellers" className="mb-5 font-display text-2xl">Sellers</h2>
        {sellers.length === 0 ? <p className="text-ink-muted">No sellers yet.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {sellers.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 py-4" data-testid="seller-row">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.shopName}</p>
                  <p className="text-sm text-ink-muted break-all">{s.email} · joined {formatDate(s.createdAt)} · {s.listingCount} listing{s.listingCount === 1 ? "" : "s"}</p>
                </div>
                <StatusBadge status={s.status} />
                {actions("seller", s.id, s.shopName, s.status)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="listings">
        <h2 id="listings" className="mb-5 font-display text-2xl">Listings</h2>
        {listings.length === 0 ? <p className="text-ink-muted">No listings yet.</p> : (
          <ul className="divide-y divide-line border-y border-line">
            {listings.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-4 py-4" data-testid="listing-row">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep">
                  {l.imagePath && <Image src={imageUrl(l.imagePath)} alt="" fill sizes="64px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${l.slug}`} className="font-medium underline-offset-4 hover:underline">{l.title}</Link>
                  <p className="text-sm text-ink-muted">{l.shopName} · from <span className="tnum">{formatPence(l.basePricePence)}</span></p>
                </div>
                <StatusBadge status={l.status} />
                {l.status === "draft" ? <span className="text-sm text-ink-muted">Draft</span> : actions("listing", l.id, l.title, l.status)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "seller" ? "Hide this shop?" : "Hide this listing?"}
        description={confirm?.kind === "seller" ? `${confirm?.name} and all its listings disappear from the shop until you approve it again.` : `${confirm?.name} disappears from the shop until you approve it again.`}
        confirmLabel="Hide"
        loading={busy !== null}
        onConfirm={() => {
          const c = confirm;
          setConfirm(null);
          if (c) void run(c.kind, c.id, "hidden");
        }}
      />
    </div>
  );
}
