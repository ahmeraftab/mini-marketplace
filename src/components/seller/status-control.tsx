"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { setOrderStatus } from "@/lib/orders/actions";
import { ORDER_STATUSES, STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

/** Next step as a primary button, plus a select for any status. Every change is logged by the database. */
export function StatusControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = ORDER_STATUSES[ORDER_STATUSES.indexOf(status) + 1] as OrderStatus | undefined;

  async function change(to: OrderStatus) {
    if (busy || to === status) return;
    setBusy(true);
    const res = await setOrderStatus({ orderId, status: to }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      toast.success(`Marked as ${STATUS_LABEL[to]}`);
      router.refresh();
    } else {
      toast.error(res && !res.ok ? res.message : "Could not update the order. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {next ? (
        <Button onClick={() => void change(next)} loading={busy} data-testid="next-status">
          Mark as {STATUS_LABEL[next]}
        </Button>
      ) : (
        <p className="text-[15px] font-medium text-moss">Delivered. Nothing more to do.</p>
      )}
      <div className="sm:w-48">
        <Select aria-label="Set status" value={status} disabled={busy} onChange={(e) => void change(e.target.value as OrderStatus)} data-testid="status-select">
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
      </div>
    </div>
  );
}
