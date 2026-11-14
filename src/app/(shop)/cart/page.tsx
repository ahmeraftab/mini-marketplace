import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { BackLink } from "@/components/layout/back-link";

export const metadata: Metadata = { title: "Your basket" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-[1320px] px-4 pb-40 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
      <BackLink href="/products" label="Keep shopping" />
      <h1 className="mb-8 font-display text-4xl tracking-tight sm:text-5xl">Your basket</h1>
      <CartView />
    </div>
  );
}
