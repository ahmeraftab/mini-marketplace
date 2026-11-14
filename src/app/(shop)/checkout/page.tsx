import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { Button } from "@/components/ui/button";
import { getSessionProfile } from "@/lib/auth";
import { BackLink } from "@/components/layout/back-link";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/checkout");

  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-40 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
      <BackLink href="/cart" label="Back to basket" />
      <h1 className="mb-8 font-display text-4xl tracking-tight sm:text-5xl">Checkout</h1>
      {session.role === "buyer" ? (
        <CheckoutForm defaultName={session.fullName} />
      ) : (
        <div className="max-w-xl rounded-card border border-line bg-surface p-8">
          <h2 className="font-display text-2xl">Sign in with a buyer account</h2>
          <p className="mt-2 text-ink-muted">
            You are signed in as a {session.role}. Only buyer accounts can place orders, so log in with a buyer account
            (the login page has a demo buyer) to continue.
          </p>
          <Button asChild className="mt-6"><Link href="/login?next=/checkout">Switch account</Link></Button>
        </div>
      )}
    </div>
  );
}
