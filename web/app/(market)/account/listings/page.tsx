import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardEmpty, DashboardHeading } from "@/components/marketplace/dashboard-blocks";
import { getSession } from "@/lib/marketplace/auth";
import { formatUtcDay } from "@/lib/marketplace/dashboard";
import { listOwnedListings } from "@/lib/marketplace/db";
import { formatMon, formatRows } from "@/lib/marketplace/format";

export const metadata: Metadata = {
  title: "Your listings · KineticVM",
  description: "Datasets this account is selling. Buyers see the file only after they pay.",
};

export default async function ListingsPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?next=/account/listings");
  const listings = await listOwnedListings(session.id);
  return (
    <>
      <DashboardHeading
        title="Listings"
        detail="Datasets this account is selling. Buyers see the file only after they pay."
        action={
          listings.length > 0 ? (
            <Link href="/account/listings/new" className="btn btn-primary">
              New listing
            </Link>
          ) : null
        }
      />
      {listings.length === 0 ? (
        <DashboardEmpty
          title="You haven't listed a dataset yet"
          detail="Upload a manifest and a data file here, or publish from a device with an agent key."
          action={
            <Link href="/account/listings/new" className="btn btn-primary">
              New listing
            </Link>
          }
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Dataset
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Rows
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Source
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Listed
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  MON
                </th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => (
                <tr key={listing.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium">
                    <Link href={`/marketplace/${listing.slug}`} className="text-ink hover:text-purple-deep">
                      {listing.title}
                    </Link>
                    <span className="mt-1 block font-mono text-xs font-normal text-muted" title={listing.dataCid}>
                      {shortCid(listing.dataCid)}
                    </span>
                  </th>
                  <td className="px-5 py-3 font-mono text-xs text-muted tabular-nums">{formatRows(listing.rowCount)}</td>
                  <td className="px-5 py-3 text-muted">{listing.source === "agent" ? "Device" : "This site"}</td>
                  <td className="px-5 py-3 text-muted">{formatUtcDay(listing.createdAt)}</td>
                  <td className="px-5 py-3 text-right font-mono text-ink tabular-nums">{formatMon(listing.priceWei)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function shortCid(value: string): string {
  return value.length < 18 ? value : `${value.slice(0, 8)}…${value.slice(-6)}`;
}
