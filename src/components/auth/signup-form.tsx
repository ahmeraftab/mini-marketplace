"use client";

import { Check, Eye, EyeOff, ShoppingBag, Store } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signUpAction } from "@/lib/auth-actions";
import { cn } from "@/lib/cn";

export function SignupForm({ initialRole, next }: { initialRole: "buyer" | "seller"; next: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, null);
  const [role, setRole] = useState<"buyer" | "seller">(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  if (state?.ok) {
    return (
      <div role="status" className="rounded-card border border-moss/30 bg-moss-soft p-6">
        <Check className="size-6 text-moss" />
        <p className="mt-3 font-display text-2xl">Almost there.</p>
        <p className="mt-2 text-[15px] text-ink-soft">{state.message}</p>
        <Button asChild className="mt-5">
          <Link href="/login">Go to log in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="role" value={role} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">I want to</legend>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
          {(
            [
              ["buyer", "Buy", "Shop and order", ShoppingBag],
              ["seller", "Sell", "Open a shop", Store],
            ] as const
          ).map(([value, label, hint, Icon]) => {
            const selected = role === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(value)}
                className={cn(
                  "flex min-h-[64px] flex-col items-start justify-center rounded-control border px-4 text-left transition-[border-color,box-shadow,background-color]",
                  selected ? "border-ink bg-surface shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong bg-surface hover:border-ink-muted",
                )}
              >
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <Icon className="size-4" /> {label}
                </span>
                <span className="text-[13px] text-ink-muted">{hint}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="Your name" error={errors?.fullName} required>
        {(a) => <Input name="fullName" autoComplete="name" required {...a} />}
      </Field>

      {role === "seller" && (
        <Field label="Shop name" hint="Shown to buyers on your listings." error={errors?.shopName} required>
          {(a) => <Input name="shopName" autoComplete="organization" required {...a} />}
        </Field>
      )}

      <Field label="Email" error={errors?.email} required>
        {(a) => <Input name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required {...a} />}
      </Field>

      <Field label="Password" hint="At least 8 characters." error={errors?.password} required>
        {(a) => (
          <div className="relative">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              required
              className="pr-12"
              {...a}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-0 grid size-11 place-items-center text-ink-muted hover:text-ink"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        )}
      </Field>

      {state && !state.ok && !state.fieldErrors && (
        <p role="alert" className="rounded-control bg-clay-soft px-3.5 py-3 text-[15px] text-clay-deep">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {role === "seller" ? "Open my shop" : "Create account"}
      </Button>
      {role === "seller" && (
        <p className="text-[13px] text-ink-muted">
          New shops are reviewed by an administrator. You can prepare listings straight away; they go live once
          your shop is approved.
        </p>
      )}
      <p className="text-center text-[15px] text-ink-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-4">
          Log in
        </Link>
      </p>
    </form>
  );
}
