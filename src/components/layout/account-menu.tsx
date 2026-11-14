"use client";

import { DropdownMenu } from "radix-ui";
import { ChevronDown, ClipboardList, LayoutDashboard, ShieldCheck, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/layout/sign-out-button";

type Props = {
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
};

const item =
  "flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-control px-3 text-[15px] outline-none data-[highlighted]:bg-paper-deep";

export function AccountMenu({ name, email, role }: Props) {
  const label = name.trim() || email.split("@")[0];
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex min-h-11 items-center gap-2 rounded-control px-2.5 text-[15px] font-medium transition-colors hover:bg-paper-deep data-[state=open]:bg-paper-deep">
        <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">
          {label.charAt(0).toUpperCase()}
        </span>
        <span className="hidden max-w-[9rem] truncate lg:inline">{label}</span>
        <ChevronDown className="size-4 text-ink-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-card border border-line bg-surface p-1.5 shadow-overlay data-[state=open]:animate-fade"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-medium">{label}</p>
            <p className="truncate text-[13px] text-ink-muted">{email}</p>
            <p className="eyebrow mt-1.5">{role}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          {role === "buyer" && (
            <DropdownMenu.Item asChild>
              <Link href="/orders" className={item}>
                <ClipboardList className="size-4" /> My orders
              </Link>
            </DropdownMenu.Item>
          )}
          {role === "seller" && (
            <DropdownMenu.Item asChild>
              <Link href="/seller" className={item}>
                <Store className="size-4" /> Seller hub
              </Link>
            </DropdownMenu.Item>
          )}
          {role === "admin" && (
            <DropdownMenu.Item asChild>
              <Link href="/admin" className={item}>
                <ShieldCheck className="size-4" /> Admin
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link href="/account" className={item}>
              <UserRound className="size-4" /> Account
            </Link>
          </DropdownMenu.Item>
          {role !== "buyer" && (
            <DropdownMenu.Item asChild>
              <Link href="/products" className={item}>
                <LayoutDashboard className="size-4" /> View the shop
              </Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild onSelect={(e) => e.preventDefault()}>
            <div>
              <SignOutButton />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
