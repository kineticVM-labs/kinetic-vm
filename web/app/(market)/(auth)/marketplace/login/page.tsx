import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/marketplace/auth-screen";
import { getSession } from "@/lib/marketplace/auth";
import { safeNext } from "@/lib/marketplace/format";

export const metadata: Metadata = {
  title: "Log in · KineticVM",
  description: "Log in to buy datasets or list machine data from a device you hold.",
};

export default async function MarketplaceLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const mode = one(query.mode) === "signup" ? "signup" : "login";
  const next = safeNext(one(query.next), mode === "signup" ? "/account" : "/marketplace");
  const destination = next.startsWith("/login") || next.startsWith("/marketplace/login") ? "/marketplace" : next;
  const session = await getSession();
  if (session) redirect(destination);
  return <AuthScreen mode={mode} next={destination} notice={noticeFor(one(query.error))} />;
}

function noticeFor(error: string): string | null {
  if (error === "google") return "Google sign-in needs a client id and secret. Use email until those are set.";
  if (error === "google-failed") return "Google sign-in did not finish. Try again, or use email.";
  return null;
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
