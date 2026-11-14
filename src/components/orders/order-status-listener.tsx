"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { getBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { STATUS_LABEL, type OrderStatus } from "@/lib/orders/status";

/**
 * Tells a buyer when a seller moves one of their orders along. Subscribes to
 * changes on the buyer's own orders (row-level security also filters what the
 * socket may deliver), and unsubscribes when the component or the user goes.
 */
export function OrderStatusListener({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getBrowserClient();
    const seen = new Set<string>(); // de-duplicate: one toast per order + status

    const channel = supabase
      .channel(`orders-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `buyer_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { id: string; order_number: string; status: OrderStatus };
          const tag = `${row.id}:${row.status}`;
          if (seen.has(tag)) return;
          seen.add(tag);
          toast.success(`Order ${row.order_number} is now ${STATUS_LABEL[row.status] ?? row.status}`);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
