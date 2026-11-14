import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">That page has gone missing.</h1>
      <p className="mt-5 text-lg text-ink-muted">
        The link may be old, or the listing may have been taken down by its seller.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/products">Browse the shop</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
