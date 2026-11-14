import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/layout/access-denied";
import { SellerNav } from "@/components/seller/seller-nav";
import { getSessionProfile } from "@/lib/auth";

export default async function SellerLayout({ children }: LayoutProps<"/seller">) {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/seller");
  if (session.role !== "seller") return <AccessDenied need="seller" role={session.role} />;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <div className="mb-8">
        <p className="text-sm text-ink-muted">Seller hub</p>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{session.seller?.shopName ?? "Your shop"}</h1>
      </div>
      {session.seller?.status === "pending" && (
        <p className="mb-6 rounded-control border border-amber-ink/20 bg-amber-soft px-4 py-3 text-sm text-amber-ink" role="status">
          Your shop is waiting for admin approval. You can prepare listings now; they go live once the shop is approved.
        </p>
      )}
      {session.seller?.status === "hidden" && (
        <p className="mb-6 rounded-control border border-clay/30 bg-clay-soft px-4 py-3 text-sm text-clay-deep" role="status">
          Your shop is hidden by an admin, so your listings are not visible and you cannot save changes.
        </p>
      )}
      <SellerNav />
      {children}
    </div>
  );
}
