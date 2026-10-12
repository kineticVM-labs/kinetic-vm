import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/marketplace/dashboard-shell";
import { getSession } from "@/lib/marketplace/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const path = accountPath((await headers()).get("x-kinetic-path"));
  if (!session) redirect(`/marketplace/login?next=${encodeURIComponent(path)}`);
  return (
    <DashboardShell email={session.email} name={session.name}>
      {children}
    </DashboardShell>
  );
}

function accountPath(value: string | null): string {
  if (!value || !value.startsWith("/account") || value.includes("..") || value.includes("\\") || value.includes("\n")) {
    return "/account";
  }
  return value;
}
