import test from "node:test";
import assert from "node:assert/strict";
import {
  clientHasNonHoldServiceDayInMonth,
  clientOverlapsMonth,
  defaultLast12MonthRange,
  holdPeriodRangesOverlap,
  parseDashboardYmd,
  pickChartCurrency,
  resolveDashboardDateRange,
  utcMonthKey,
  utcMonthKeys,
  inclusiveUtcDaySpan,
} from "@/lib/private-clinic/clinic-dashboard-range";

test("parseDashboardYmd accepts valid UTC dates", () => {
  const d = parseDashboardYmd("2026-03-15");
  assert.ok(d);
  assert.equal(d!.toISOString(), "2026-03-15T00:00:00.000Z");
  assert.equal(parseDashboardYmd("2026-02-30"), null);
  assert.equal(parseDashboardYmd(""), null);
});

test("defaultLast12MonthRange covers 12 UTC months including current", () => {
  const now = new Date(Date.UTC(2026, 8, 1)); // 1 Sep 2026
  const r = defaultLast12MonthRange(now);
  assert.equal(r.fromYmd, "2025-10-01");
  assert.equal(r.toYmd, "2026-09-30");
  assert.equal(r.rangeStart.toISOString(), "2025-10-01T00:00:00.000Z");
  assert.equal(r.rangeEndExclusive.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(utcMonthKeys(r.rangeStart, r.rangeEndExclusive).length, 12);
});

test("resolveDashboardDateRange defaults and swaps inverted bounds", () => {
  const now = new Date(Date.UTC(2026, 7, 15));
  const def = resolveDashboardDateRange("", "", now);
  assert.equal(def.fromYmd, "2025-09-01");
  assert.equal(def.toYmd, "2026-08-31");

  const swapped = resolveDashboardDateRange("2026-06-10", "2026-03-01", now);
  assert.equal(swapped.fromYmd, "2026-03-01");
  assert.equal(swapped.toYmd, "2026-06-10");
  assert.equal(swapped.rangeEndExclusive.toISOString(), "2026-06-11T00:00:00.000Z");
});

test("utcMonthKey uses UTC calendar month", () => {
  assert.equal(utcMonthKey(new Date("2026-03-01T00:00:00.000Z")), "2026-03");
  assert.equal(utcMonthKey(new Date("2026-03-31T23:59:59.000Z")), "2026-03");
});

test("clientOverlapsMonth uses start and end dates inclusive", () => {
  const start = parseDashboardYmd("2026-03-15");
  const end = parseDashboardYmd("2026-05-10");
  assert.equal(clientOverlapsMonth(start, end, "2026-02"), false);
  assert.equal(clientOverlapsMonth(start, end, "2026-03"), true);
  assert.equal(clientOverlapsMonth(start, end, "2026-04"), true);
  assert.equal(clientOverlapsMonth(start, end, "2026-05"), true);
  assert.equal(clientOverlapsMonth(start, end, "2026-06"), false);
  assert.equal(clientOverlapsMonth(null, null, "2026-01"), true);
  assert.equal(clientOverlapsMonth(null, parseDashboardYmd("2026-02-01"), "2026-02"), true);
  assert.equal(clientOverlapsMonth(null, parseDashboardYmd("2026-02-01"), "2026-03"), false);
});

test("pickChartCurrency prefers ILS then largest total", () => {
  assert.equal(pickChartCurrency([]), null);
  assert.equal(
    pickChartCurrency([
      { currency: "USD", total: 100 },
      { currency: "ILS", total: 10 },
    ]),
    "ILS",
  );
  assert.equal(
    pickChartCurrency([
      { currency: "USD", total: 100 },
      { currency: "EUR", total: 40 },
    ]),
    "USD",
  );
});

test("inclusiveUtcDaySpan is inclusive of first and last UTC dates", () => {
  assert.equal(
    inclusiveUtcDaySpan(new Date("2026-03-15T08:00:00.000Z"), new Date("2026-03-15T22:00:00.000Z")),
    1,
  );
  assert.equal(
    inclusiveUtcDaySpan(new Date("2026-03-01T00:00:00.000Z"), new Date("2026-03-10T23:59:59.000Z")),
    10,
  );
  assert.equal(
    inclusiveUtcDaySpan(new Date("2026-03-10T12:00:00.000Z"), new Date("2026-03-01T12:00:00.000Z")),
    10,
  );
});

test("partial-month hold still counts as active", () => {
  const start = parseDashboardYmd("2026-03-01");
  const end = parseDashboardYmd("2026-03-31");
  const holds = [{ started_on: parseDashboardYmd("2026-03-10")!, ended_on: parseDashboardYmd("2026-03-20") }];
  assert.equal(clientHasNonHoldServiceDayInMonth(start, end, holds, "2026-03"), true);
});

test("full-month hold is omitted from that month", () => {
  const start = parseDashboardYmd("2026-01-01");
  const end = parseDashboardYmd("2026-12-31");
  const holds = [{ started_on: parseDashboardYmd("2026-03-01")!, ended_on: parseDashboardYmd("2026-04-01") }];
  assert.equal(clientHasNonHoldServiceDayInMonth(start, end, holds, "2026-03"), false);
  assert.equal(clientHasNonHoldServiceDayInMonth(start, end, holds, "2026-04"), true);
});

test("open hold covers from start through later months", () => {
  const start = parseDashboardYmd("2026-01-01");
  const holds = [{ started_on: parseDashboardYmd("2026-02-15")!, ended_on: null }];
  assert.equal(clientHasNonHoldServiceDayInMonth(start, null, holds, "2026-02"), true);
  assert.equal(clientHasNonHoldServiceDayInMonth(start, null, holds, "2026-03"), false);
  assert.equal(clientHasNonHoldServiceDayInMonth(start, null, holds, "2026-01"), true);
});

test("multiple disjoint holds still count a month with a gap", () => {
  const start = parseDashboardYmd("2026-03-01");
  const end = parseDashboardYmd("2026-03-31");
  const holds = [
    { started_on: parseDashboardYmd("2026-03-01")!, ended_on: parseDashboardYmd("2026-03-10") },
    { started_on: parseDashboardYmd("2026-03-20")!, ended_on: parseDashboardYmd("2026-03-31") },
  ];
  assert.equal(clientHasNonHoldServiceDayInMonth(start, end, holds, "2026-03"), true);
});

test("adjacent holds (return day then next start) do not overlap", () => {
  const a = { started_on: parseDashboardYmd("2026-03-01")!, ended_on: parseDashboardYmd("2026-03-10") };
  const b = { started_on: parseDashboardYmd("2026-03-10")!, ended_on: parseDashboardYmd("2026-03-20") };
  assert.equal(holdPeriodRangesOverlap(a, b), false);
  const touchingLater = {
    started_on: parseDashboardYmd("2026-03-11")!,
    ended_on: parseDashboardYmd("2026-03-20"),
  };
  assert.equal(holdPeriodRangesOverlap(a, touchingLater), false);
});

test("overlapping holds including two open periods are detected", () => {
  const a = { started_on: parseDashboardYmd("2026-03-01")!, ended_on: parseDashboardYmd("2026-03-15") };
  const b = { started_on: parseDashboardYmd("2026-03-10")!, ended_on: parseDashboardYmd("2026-03-20") };
  assert.equal(holdPeriodRangesOverlap(a, b), true);
  const openA = { started_on: parseDashboardYmd("2026-03-01")!, ended_on: null };
  const openB = { started_on: parseDashboardYmd("2026-06-01")!, ended_on: null };
  assert.equal(holdPeriodRangesOverlap(openA, openB), true);
});

test("active-day math does not depend on a cached on_hold flag", () => {
  const start = parseDashboardYmd("2026-03-01");
  const holds = [{ started_on: parseDashboardYmd("2026-03-01")!, ended_on: parseDashboardYmd("2026-04-01") }];
  assert.equal(clientHasNonHoldServiceDayInMonth(start, null, holds, "2026-03"), false);
  assert.equal(clientHasNonHoldServiceDayInMonth(start, null, [], "2026-03"), true);
});
