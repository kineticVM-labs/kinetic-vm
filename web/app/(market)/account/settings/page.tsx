import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardHeading } from "@/components/marketplace/dashboard-blocks";
import { SettingsForm } from "@/components/marketplace/settings-form";
import { getSession } from "@/lib/marketplace/auth";

export const metadata: Metadata = {
  title: "Settings · KineticVM",
  description: "The name on your account, and the wallet that receives MON when someone buys your data.",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?next=/account/settings");
  return (
    <>
      <DashboardHeading title="Settings" detail="The name on your account, and the wallet that receives MON when someone buys your data." />
      <div className="mt-8 max-w-xl rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <SettingsForm name={session.name} payout={session.payout} />
      </div>
    </>
  );
}
