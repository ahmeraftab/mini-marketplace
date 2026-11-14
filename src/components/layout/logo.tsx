import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/cn";

/** A divan seen from the side: headboard, base, two feet. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden="true">
      <rect x="2" y="6" width="4.5" height="17" rx="1.2" fill="currentColor" />
      <rect x="2" y="13" width="28" height="9" rx="1.6" fill="currentColor" />
      <rect x="5" y="22" width="3" height="4.5" rx="0.8" fill="currentColor" />
      <rect x="24" y="22" width="3" height="4.5" rx="0.8" fill="currentColor" />
      <rect x="9" y="9.6" width="16" height="3.4" rx="1.7" fill="var(--color-clay)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${SITE_NAME} home`}>
      <LogoMark className="transition-transform duration-500 ease-out-expo group-hover:-rotate-3" />
      <span className="font-display text-[1.35rem] font-medium leading-none tracking-tight">{SITE_NAME}</span>
    </Link>
  );
}
