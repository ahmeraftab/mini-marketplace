import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Order placed" };

export default async function SuccessPage(props: PageProps<"/checkout/success">) {
  const raw = (await props.searchParams).orders;
  const text = Array.isArray(raw) ? raw[0] : raw;
  const numbers = (text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^MM-\d{4,10}$/.test(s))
    .slice(0, 10);

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <CheckCircle2 className="mx-auto size-14 text-moss" strokeWidth={1.4} />
      <h1 className="mt-6 font-display text-4xl tracking-tight">Thank you, your order is in</h1>
      {numbers.length > 0 && (
        <p className="mt-4 text-lg" data-testid="order-numbers">
          Order {numbers.join(", ")}
        </p>
      )}
      <p className="mx-auto mt-3 max-w-md text-ink-muted">
        The seller has been told. You can follow each step, from New to Delivered, in your orders. This is a demo, so no
        payment was taken.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg"><Link href="/orders">View my orders</Link></Button>
        <Button asChild size="lg" variant="secondary"><Link href="/products">Keep shopping</Link></Button>
      </div>
    </div>
  );
}
