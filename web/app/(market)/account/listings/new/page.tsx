import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardHeading } from "@/components/marketplace/dashboard-blocks";
import { ListingForm } from "@/components/marketplace/listing-form";
import { getSession } from "@/lib/marketplace/auth";
import { pinataConfigured } from "@/lib/marketplace/pinata";

export const metadata: Metadata = {
  title: "List a dataset · KineticVM",
  description: "Upload a manifest and a data file. The file stays sealed until a buyer verifies the rows and pays.",
};

export default async function NewListingPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?mode=signup&next=/account/listings/new");
  return (
    <>
      <DashboardHeading
        title="List a dataset"
        detail="Upload the manifest and the data file. They stay sealed until a buyer verifies the rows and pays. The NFT check happens when you issue an API key, not on this form."
      />
      <div className="mt-8 max-w-2xl rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <ListingForm payout={session.payout ?? ""} pinataReady={pinataConfigured()} />
      </div>
    </>
  );
}
