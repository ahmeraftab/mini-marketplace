import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DeleteListing } from "@/components/seller/delete-listing";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { requireSeller } from "@/lib/auth";
import { getSellerListings } from "@/lib/catalog/queries";
import { imageUrl } from "@/lib/images";
import { formatPence } from "@/lib/money";

export const metadata: Metadata = { title: "Your listings" };

export default async function SellerHome() {
  const session = await requireSeller("/seller");
  if (!session) return null;
  const listings = await getSellerListings(session.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl">Listings</h2>
        <Button asChild>
          <Link href="/seller/products/new"><Plus className="size-4" /> New listing</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
          <h3 className="font-display text-2xl">Nothing listed yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-ink-muted">Add your first bed with photos, colours and options. An admin approves it before buyers see it.</p>
          <Button asChild className="mt-6"><Link href="/seller/products/new">Add a listing</Link></Button>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {listings.map((p) => {
            const photo = p.images.find((i) => i.colourId === p.colours[0]?.id) ?? p.images[0];
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-5" data-testid="listing-row">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-[3px] bg-paper-deep">
                  {photo && <Image src={imageUrl(photo.path)} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-snug">{p.title}</p>
                  <p className="mt-0.5 flex items-center gap-3 text-sm text-ink-muted">
                    <StatusBadge status={p.status} />
                    <span className="tnum">from {formatPence(p.basePricePence)}</span>
                  </p>
                </div>
                <div className="flex w-full items-center gap-1 sm:w-auto">
                  <Button asChild variant="secondary" size="sm"><Link href={`/seller/products/${p.id}/edit`}>Edit</Link></Button>
                  <DeleteListing id={p.id} title={p.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
