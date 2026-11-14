import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getSessionProfile, homeFor } from "@/lib/auth";
import { safeNextPath } from "@/lib/format";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const session = await getSessionProfile();
  if (session) redirect(homeFor(session.role));

  return (
    <AuthShell
      eyebrow="Join the market"
      title="Create an account"
      intro="Buy beds made your way, or open a shop and list your own."
    >
      <SignupForm initialRole={params.role === "seller" ? "seller" : "buyer"} next={next} />
    </AuthShell>
  );
}
