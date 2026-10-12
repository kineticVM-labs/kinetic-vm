import assert from "node:assert/strict";
import test from "node:test";

import { plotY, seriesPeak, startOfUtcDay, trailingSeries } from "./dashboard.ts";

const NOW = Date.UTC(2026, 9, 11, 15, 0, 0);
const MON = 10n ** 18n;

test("today's purchase lands on the last day and older sales stay in range", () => {
  const series = trailingSeries(
    NOW,
    [{ at: NOW, wei: MON.toString() }],
    [{ at: NOW - 29 * 86_400_000, wei: (MON * 2n).toString() }],
  );
  assert.equal(series.length, 30);
  assert.equal(series[29]?.spentWei, MON);
  assert.equal(series[29]?.earnedWei, 0n);
  assert.equal(series[0]?.earnedWei, MON * 2n);
  assert.equal(series[0]?.spentWei, 0n);
  assert.equal(seriesPeak(series), MON * 2n);
});

test("a transfer before the window is ignored", () => {
  const series = trailingSeries(NOW, [{ at: startOfUtcDay(NOW) - 30 * 86_400_000, wei: MON.toString() }], []);
  assert.ok(series.every((point) => point.spentWei === 0n));
});

test("a non-numeric amount does not move the series", () => {
  const series = trailingSeries(NOW, [{ at: NOW, wei: "12 MON" }], []);
  assert.equal(series[29]?.spentWei, 0n);
});

test("the plot baseline is the bottom and the peak is the top", () => {
  assert.equal(plotY(0n, MON, 100), 100);
  assert.equal(plotY(MON, MON, 100), 0);
  assert.equal(plotY(MON / 2n, MON, 100), 50);
  assert.equal(plotY(0n, 0n, 100), 100);
});
