import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Moderation } from "@/components/admin/moderation";
import { AccessDenied } from "@/components/layout/access-denied";
import { getAdminData } from "@/lib/admin/queries";
import { getSessionProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") return <AccessDenied need="admin" role={session.role} />;
  const { sellers, listings } = await getAdminData();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <p className="text-sm text-ink-muted">Admin</p>
      <h1 className="mb-10 font-display text-3xl tracking-tight sm:text-4xl">Shops and listings</h1>
      <Moderation sellers={sellers} listings={listings} />
    </div>
  );
}
