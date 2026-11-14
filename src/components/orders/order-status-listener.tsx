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
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      // The socket must carry the signed-in person's token BEFORE it subscribes: with only the
      // public key it runs as the anonymous role, which may not read orders, and the server
      // refuses the subscription ("invalid column for filter").
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel(`orders-${userId}-${Math.random().toString(36).slice(2, 8)}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `buyer_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as { id: string; order_number: string; status: OrderStatus };
            const tag = `${row.id}:${row.status}`;
            if (seen.has(tag)) return;
            seen.add(tag);
            // the id makes sonner show one toast per order + status even if two listeners ever overlap
            toast.success(`Order ${row.order_number} is now ${STATUS_LABEL[row.status] ?? row.status}`, { id: tag });
            router.refresh();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
