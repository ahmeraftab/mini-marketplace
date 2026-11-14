"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction } from "@/lib/auth-actions";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo/accounts";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(signInAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  const fillDemo = (email: string) => {
    if (emailRef.current) emailRef.current.value = email;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
    passwordRef.current?.focus();
  };

  return (
    <div className="space-y-8">
      <form action={formAction} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" error={errors?.email} required>
          {(a) => (
            <Input ref={emailRef} name="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" required {...a} />
          )}
        </Field>
        <Field label="Password" error={errors?.password} required>
          {(a) => (
            <div className="relative">
              <Input
                ref={passwordRef}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
          Log in
        </Button>
        <p className="text-center text-[15px] text-ink-muted">
          New here?{" "}
          <Link href={`/signup${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </p>
      </form>

      <section aria-labelledby="demo-heading" className="rounded-card border border-dashed border-line-strong p-4">
        <h2 id="demo-heading" className="eyebrow font-sans">
          Demo accounts
        </h2>
        <p className="mt-1 text-[13px] text-ink-muted">Sample logins for each role. Tap one to fill the form.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.role}>
              <button
                type="button"
                onClick={() => fillDemo(account.email)}
                className="flex min-h-11 w-full flex-col items-start rounded-control border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-ink"
              >
                <span className="text-sm font-semibold">{account.label}</span>
                <span className="text-[12px] leading-snug text-ink-muted">{account.blurb}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
