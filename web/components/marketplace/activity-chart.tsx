import { formatMon } from "@/lib/marketplace/format";
import { formatUtcDay, plotY, seriesPeak, type SeriesPoint } from "@/lib/marketplace/dashboard";

const HEIGHT = 100;

export function SpendChart({ points }: { points: SeriesPoint[] }) {
  const peak = seriesPeak(points);
  const spent = linePath(points.map((point) => plotY(point.spentWei, peak, HEIGHT)));
  const earned = linePath(points.map((point) => plotY(point.earnedWei, peak, HEIGHT)));
  const area = `${spent} L 100 ${HEIGHT} L 0 ${HEIGHT} Z`;
  const first = points[0];
  const middle = points[Math.floor(points.length / 2)];
  const last = points[points.length - 1];
  const active = points.filter((point) => point.spentWei > 0n || point.earnedWei > 0n);

  return (
    <div>
      <div className="flex items-end gap-3">
        <div className="flex h-48 w-14 shrink-0 flex-col justify-between text-right font-mono text-[11px] text-muted tabular-nums" aria-hidden="true">
          <span>{peak === 0n ? "" : formatMon(peak)}</span>
          <span>{peak === 0n ? "" : formatMon(peak / 2n)}</span>
          <span>0</span>
        </div>
        <svg viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" className="h-48 min-w-0 flex-1" role="img">
          <title>Spent and earned MON for each of the last 30 days</title>
          <line x1="0" y1="0" x2="100" y2="0" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1="100" x2="100" y2="100" stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={area} fill="var(--purple)" fillOpacity="0.16" />
          <path d={spent} fill="none" stroke="var(--purple)" strokeWidth="1.75" vectorEffect="non-scaling-stroke" />
          <path d={earned} fill="none" stroke="var(--ink)" strokeWidth="1.75" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 flex justify-between pl-[4.25rem] font-mono text-[11px] text-muted" aria-hidden="true">
        <span>{first ? formatUtcDay(first.start) : ""}</span>
        <span>{middle ? formatUtcDay(middle.start) : ""}</span>
        <span>{last ? formatUtcDay(last.start) : ""}</span>
      </div>
      {peak === 0n ? <p className="mt-4 text-sm text-muted">No MON moved in the last 30 days.</p> : null}
      {active.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted hover:text-ink">Daily totals</summary>
          <table className="mt-3 w-full text-left text-sm">
            <caption className="sr-only">Days with a purchase or a sale</caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2 font-medium">
                  Day
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Spent
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Earned
                </th>
              </tr>
            </thead>
            <tbody>
              {active.map((point) => (
                <tr key={point.start} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 font-normal text-ink">
                    {formatUtcDay(point.start)}
                  </th>
                  <td className="py-2 text-right font-mono text-ink tabular-nums">{formatMon(point.spentWei)}</td>
                  <td className="py-2 text-right font-mono text-ink tabular-nums">{formatMon(point.earnedWei)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ) : null}
    </div>
  );
}

export function MachineBars({ rows }: { rows: { label: string; count: number }[] }) {
  const used = rows.filter((row) => row.count > 0);
  if (used.length === 0) {
    return <p className="text-sm leading-6 text-muted">Purchases will group by machine once you buy a dataset.</p>;
  }
  const max = Math.max(...used.map((row) => row.count));
  return (
    <ul className="space-y-4">
      {used.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">{row.label}</span>
            <span className="font-mono text-muted tabular-nums">{row.count}</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-lilac" role="presentation">
            <div className="h-full rounded-full bg-purple" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function linePath(ys: number[]): string {
  if (ys.length === 0) return "";
  return ys
    .map((y, index) => {
      const x = ys.length === 1 ? 0 : (index / (ys.length - 1)) * 100;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
