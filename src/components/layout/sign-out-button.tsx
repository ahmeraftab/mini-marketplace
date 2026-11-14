"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth-actions";
import { useCart } from "@/lib/cart/store";
import { cn } from "@/lib/cn";

/** Signing out also empties this device's basket. */
export function SignOutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <form action={signOutAction} onSubmit={() => useCart.getState().clear()}>
      <button
        type="submit"
        className={cn(
          "inline-flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-[15px] hover:bg-paper-deep",
          className,
        )}
      >
        {children ?? (
          <>
            <LogOut className="size-4" /> Log out
          </>
        )}
      </button>
    </form>
  );
}
