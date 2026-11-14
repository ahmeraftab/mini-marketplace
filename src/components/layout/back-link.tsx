import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * An in-app way back. An installed phone app has no browser back button, so the
 * pages inside a flow link to their parent. A plain link (not history.back) so it
 * also works when the page was opened directly.
 */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("-ml-2 mb-3 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm text-ink-muted hover:text-ink", className)}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
