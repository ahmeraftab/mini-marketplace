"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/sheet";
import { deleteProduct } from "@/lib/seller/actions";

export function DeleteListing({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await deleteProduct(id).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      setOpen(false);
      toast.success("Listing deleted");
      router.refresh();
    } else {
      toast.error(res && !res.ok ? res.message : "Could not delete that listing. Please try again.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-muted hover:text-clay"
        aria-label={`Delete ${title}`}
      >
        <Trash2 className="size-4" /> Delete
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete this listing?"
        description="It disappears from the shop. Orders already placed keep their details."
        confirmLabel="Delete listing"
        onConfirm={() => void confirm()}
        loading={busy}
      />
    </>
  );
}
