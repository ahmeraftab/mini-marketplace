import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  neutral: "bg-paper-deep text-ink-soft",
  clay: "bg-clay text-white",
  claySoft: "bg-clay-soft text-clay-deep",
  moss: "bg-moss-soft text-moss",
  amber: "bg-amber-soft text-amber-ink",
  outline: "border border-line-strong text-ink-soft",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof tones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof tones; label: string }> = {
    new: { tone: "amber", label: "New" },
    confirmed: { tone: "claySoft", label: "Confirmed" },
    shipped: { tone: "neutral", label: "Shipped" },
    delivered: { tone: "moss", label: "Delivered" },
    draft: { tone: "neutral", label: "Draft" },
    pending: { tone: "amber", label: "Pending" },
    approved: { tone: "moss", label: "Approved" },
    hidden: { tone: "claySoft", label: "Hidden" },
  };
  const entry = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
