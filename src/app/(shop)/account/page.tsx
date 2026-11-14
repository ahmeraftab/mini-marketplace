import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { Button } from "@/components/ui/button";
import { getSessionProfile, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/account");
  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:px-6 lg:pt-12">
      <h1 className="font-display text-4xl tracking-tight">Account</h1>
      <dl className="mt-8 divide-y divide-line border-y border-line">
        <div className="flex justify-between gap-4 py-4"><dt className="text-ink-muted">Name</dt><dd>{session.fullName || "—"}</dd></div>
        <div className="flex justify-between gap-4 py-4"><dt className="text-ink-muted">Email</dt><dd className="break-all">{session.email}</dd></div>
        <div className="flex justify-between gap-4 py-4"><dt className="text-ink-muted">Role</dt><dd className="capitalize">{session.role}</dd></div>
        {session.seller && <div className="flex justify-between gap-4 py-4"><dt className="text-ink-muted">Shop</dt><dd>{session.seller.shopName} ({session.seller.status})</dd></div>}
      </dl>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary"><Link href={session.role === "buyer" ? "/orders" : homeFor(session.role)}>{session.role === "buyer" ? "My orders" : "Open dashboard"}</Link></Button>
        <SignOutButton />
      </div>
    </div>
  );
}
