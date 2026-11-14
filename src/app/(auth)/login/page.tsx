import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getSessionProfile, homeFor } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const session = await getSessionProfile();
  if (session) redirect(next !== "/" ? next : homeFor(session.role));

  return (
    <AuthShell eyebrow="Welcome back" title="Log in" intro="Pick up where you left off: your basket, your orders, your shop.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
