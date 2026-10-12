import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MachineBars, SpendChart } from "@/components/marketplace/activity-chart";
import { DashboardActions } from "@/components/marketplace/dashboard-nav";
import { MACHINE_TYPES } from "@/lib/marketplace/catalog";
import { formatUtcDay, seriesPeak, sumWei, trailingSeriesNow } from "@/lib/marketplace/dashboard";
import { listOwnedListings, listPurchases, listSales } from "@/lib/marketplace/db";
import { formatMon } from "@/lib/marketplace/format";
import { getSession } from "@/lib/marketplace/auth";

export const metadata: Metadata = {
  title: "Dashboard · KineticVM",
  description: "What this account has spent, earned, listed, and bought.",
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/marketplace/login?next=/account");
  const listings = await listOwnedListings(session.id);
  const purchases = await listPurchases(session.id);
  const sales = await listSales(session.id);
  const series = trailingSeriesNow(
    purchases.map((purchase) => ({ at: purchase.boughtAt, wei: purchase.priceWei })),
    sales.map((sale) => ({ at: sale.soldAt, wei: sale.priceWei })),
  );
  const spent = sumWei(purchases.map((purchase) => purchase.priceWei));
  const earned = sumWei(sales.map((sale) => sale.priceWei));
  const machines = MACHINE_TYPES.map((machine) => ({
    label: machine.label,
    count: purchases.filter((purchase) => purchase.machineType === machine.id).length,
  })).filter((row) => row.count > 0);
  const activity = [
    ...purchases.map((purchase) => ({
      id: `bought-${purchase.slug}-${purchase.boughtAt}`,
      kind: "Bought",
      title: purchase.title,
      href: `/marketplace/${purchase.slug}`,
      at: purchase.boughtAt,
      wei: purchase.priceWei,
    })),
    ...sales.map((sale) => ({
      id: `sold-${sale.slug}-${sale.soldAt}`,
      kind: "Sold",
      title: sale.title,
      href: `/marketplace/${sale.slug}`,
      at: sale.soldAt,
      wei: sale.priceWei,
    })),
    ...listings.map((listing) => ({
      id: `listed-${listing.id}`,
      kind: "Listed",
      title: listing.title,
      href: `/marketplace/${listing.slug}`,
      at: listing.createdAt,
      wei: listing.priceWei,
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);
  const windowSpent = series.reduce((total, point) => total + point.spentWei, 0n);
  const windowEarned = series.reduce((total, point) => total + point.earnedWei, 0n);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Overview</h1>
          <p className="mt-1 text-sm text-muted">{session.email}</p>
        </div>
        <DashboardActions />
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Spent" value={`${formatMon(spent)} MON`} detail="All time" href="/account/purchases" />
        <Metric label="Bought" value={String(purchases.length)} detail={purchases.length === 1 ? "Dataset" : "Datasets"} href="/account/purchases" />
        <Metric label="Listed" value={String(listings.length)} detail={listings.length === 1 ? "Dataset" : "Datasets"} href="/account/listings" />
        <Metric label="Earned" value={`${formatMon(earned)} MON`} detail="All time" href="/account/listings" />
      </ul>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-line bg-surface p-5 lg:col-span-2" aria-labelledby="spend-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="spend-heading" className="text-sm font-medium text-ink">
                MON over 30 days
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted">Spent is what you paid. Earned is what buyers paid for your listings.</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full bg-purple" aria-hidden="true" />
                Spent
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-4 border-t border-dashed border-ink" aria-hidden="true" />
                Earned
              </span>
            </div>
          </div>
          <p className="sr-only">
            {formatMon(windowSpent)} MON spent and {formatMon(windowEarned)} MON earned. The highest day is {formatMon(seriesPeak(series))} MON.
          </p>
          <div className="mt-6">
            <SpendChart points={series} />
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="machine-heading">
          <h2 id="machine-heading" className="text-sm font-medium text-ink">
            Purchases by machine
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">All-time buys, grouped by the machine that produced the data.</p>
          <div className="mt-6">
            <MachineBars rows={machines} />
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-line bg-surface" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <h2 id="recent-heading" className="text-sm font-medium text-ink">
            Recent
          </h2>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-10 text-sm leading-6 text-muted">You have not bought or listed a dataset yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Kind
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Dataset
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    MON
                  </th>
                </tr>
              </thead>
              <tbody>
                {activity.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 text-muted">{row.kind}</td>
                    <td className="px-5 py-3">
                      <Link href={row.href} className="font-medium text-ink hover:text-purple-deep">
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted">{formatUtcDay(row.at)}</td>
                    <td className="px-5 py-3 text-right font-mono text-ink tabular-nums">{formatMon(row.wei)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, detail, href }: { label: string; value: string; detail: string; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded-2xl border border-line bg-surface px-4 py-4 hover:border-lilac-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
      >
        <span className="block text-sm text-muted">{label}</span>
        <span className="mt-2 block font-mono text-2xl tracking-[-0.03em] text-ink tabular-nums">{value}</span>
        <span className="mt-1 block text-xs text-muted">{detail}</span>
      </Link>
    </li>
  );
}
