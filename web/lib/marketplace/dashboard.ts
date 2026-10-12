const DAY = 86_400_000;

export type SeriesPoint = {
  start: number;
  spentWei: bigint;
  earnedWei: bigint;
};

export function startOfUtcDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function formatUtcDay(ms: number): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(ms);
}

function weiOf(value: string): bigint {
  return /^[0-9]+$/.test(value) ? BigInt(value) : 0n;
}

/** Chart window for the request that is rendering the dashboard. */
export function trailingSeriesNow(
  purchases: { at: number; wei: string }[],
  sales: { at: number; wei: string }[],
  days = 30,
): SeriesPoint[] {
  return trailingSeries(Date.now(), purchases, sales, days);
}

/** One point per UTC day, ending today. Amounts outside the window are dropped. */
export function trailingSeries(
  now: number,
  purchases: { at: number; wei: string }[],
  sales: { at: number; wei: string }[],
  days = 30,
): SeriesPoint[] {
  const today = startOfUtcDay(now);
  const points: SeriesPoint[] = Array.from({ length: days }, (_, index) => ({
    start: today - (days - 1 - index) * DAY,
    spentWei: 0n,
    earnedWei: 0n,
  }));
  const add = (at: number, wei: string, field: "spentWei" | "earnedWei") => {
    const start = startOfUtcDay(at);
    const point = points.find((item) => item.start === start);
    if (!point) return;
    point[field] += weiOf(wei);
  };
  for (const row of purchases) add(row.at, row.wei, "spentWei");
  for (const row of sales) add(row.at, row.wei, "earnedWei");
  return points;
}

export function sumWei(values: string[]): bigint {
  return values.reduce((total, value) => total + weiOf(value), 0n);
}

/** Pixel y inside a plot of `height`, with 0 at the bottom. */
export function plotY(wei: bigint, maxWei: bigint, height: number): number {
  if (maxWei <= 0n || wei <= 0n) return height;
  if (wei >= maxWei) return 0;
  const ratio = Number((wei * 10000n) / maxWei) / 10000;
  return height - ratio * height;
}

export function seriesPeak(points: SeriesPoint[]): bigint {
  return points.reduce((max, point) => {
    const peak = point.spentWei > point.earnedWei ? point.spentWei : point.earnedWei;
    return peak > max ? peak : max;
  }, 0n);
}
