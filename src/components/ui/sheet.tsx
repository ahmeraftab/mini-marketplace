"use client";

import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A panel that is a bottom sheet on phones and a right-hand drawer on larger
 * screens. Focus is trapped, Escape closes, and the page behind is inert.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "auto",
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "auto" | "bottom";
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-fade" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex flex-col bg-paper shadow-overlay outline-none",
            "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[14px]",
            "data-[state=open]:animate-sheet-up data-[state=closed]:animate-sheet-down",
            side === "auto" &&
              "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-none " +
                "md:data-[state=open]:animate-sheet-in-right md:data-[state=closed]:animate-sheet-out-right",
            className,
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong md:hidden" aria-hidden="true" />
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-4 md:pt-5">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted transition-colors hover:bg-paper-deep hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
          {footer && <footer className="pb-safe border-t border-line bg-paper px-5 py-4">{footer}</footer>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A centred confirmation dialog for destructive actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-ink/45 data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card bg-paper p-6 shadow-overlay outline-none data-[state=open]:animate-fade">
          <Dialog.Title className="font-display text-xl">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[15px] text-ink-muted">{description}</Dialog.Description>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close className="inline-flex min-h-11 items-center justify-center rounded-control border border-line-strong bg-surface px-5 text-[15px] font-medium hover:border-ink">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-clay px-5 text-[15px] font-medium text-white transition-colors hover:bg-clay-deep disabled:opacity-60"
            >
              {loading ? "Working…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
