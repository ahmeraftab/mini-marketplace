import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Shown instead of a page the signed-in user's role may not open. */
export function AccessDenied({ need, role }: { need: "seller" | "admin"; role: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6" data-testid="access-denied">
      <LockKeyhole className="mx-auto size-10 text-ink-muted" strokeWidth={1.4} />
      <h1 className="mt-5 font-display text-3xl">This area is for {need === "admin" ? "admins" : "sellers"}</h1>
      <p className="mt-3 text-ink-muted">
        You are signed in as a {role}. Switch to {need === "admin" ? "the admin" : "a seller"} account to continue.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild><Link href={`/login?next=/${need}`}>Switch account</Link></Button>
        <Button asChild variant="secondary"><Link href="/">Back to the shop</Link></Button>
      </div>
    </div>
  );
}
