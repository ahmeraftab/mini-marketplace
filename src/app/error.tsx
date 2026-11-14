"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const notConfigured = /not configured/i.test(error.message);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-24 sm:px-6">
      <p className="eyebrow">{notConfigured ? "Setup needed" : "Something went wrong"}</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">
        {notConfigured ? "The backend is not connected yet." : "We could not load this page."}
      </h1>
      <p className="mt-5 text-lg text-ink-muted">
        {notConfigured
          ? "Add the Supabase keys to .env.local and restart the server (see the README)."
          : "It is probably temporary. Try again, or head back to the shop."}
      </p>
      {error.digest && <p className="mt-3 text-sm text-ink-muted">Reference: {error.digest}</p>}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button size="lg" onClick={reset}>
          Try again
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
