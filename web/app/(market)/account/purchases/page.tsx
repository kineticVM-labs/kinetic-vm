import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardEmpty, DashboardHeading } from "@/components/marketplace/dashboard-blocks";
import { DashboardActions } from "@/components/marketplace/dashboard-nav";
import { getSession } from "@/lib/marketplace/auth";
import { formatUtcDay } from "@/lib/marketplace/dashboard";
import { listPurchases } from "@/lib/marketplace/db";
import { formatMon } from "@/lib/marketplace/format";

export const metadata: Metadata = {
  title: "Purchases · KineticVM",
  description: "Datasets you have paid for. The file and its content id stay available here.",
};

export default async function PurchasesPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?next=/account/purchases");
  const purchases = await listPurchases(session.id);
  return (
    <>
      <DashboardHeading
        title="Purchases"
        detail="Datasets you have paid for. The file and its CID stay available here."
        action={
          purchases.length > 0 ? <DashboardActions /> : null
        }
      />
      {purchases.length === 0 ? (
        <DashboardEmpty
          title="You haven't bought a dataset yet"
          detail="Paid files show up here, with a download and the content id."
          action={
            <DashboardActions />
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
                  Bought
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  CID
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  MON
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Download</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => (
                <tr key={purchase.slug} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium">
                    <Link href={`/marketplace/${purchase.slug}`} className="text-ink hover:text-purple-deep">
                      {purchase.title}
                    </Link>
                    <span className="mt-1 block font-normal text-muted">{purchase.seller}</span>
                  </th>
                  <td className="px-5 py-3 text-muted">{formatUtcDay(purchase.boughtAt)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted" title={purchase.access.dataCid}>
                    {shortCid(purchase.access.dataCid)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-ink tabular-nums">{formatMon(purchase.priceWei)}</td>
                  <td className="px-5 py-3 text-right">
                    <a className="inline-flex min-h-10 items-center text-sm font-medium text-purple-deep hover:underline" href={`/api/marketplace/listings/${purchase.slug}/file?part=data`}>
                      Download
                    </a>
                  </td>
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
