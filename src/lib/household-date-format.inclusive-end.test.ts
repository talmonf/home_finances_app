import assert from "node:assert/strict";
import test from "node:test";
import {
  inclusiveEndOfIsraelCalendarDay,
  parseToDateAsEndOfIsraelDay,
  parseToDateAsEndOfUtcDay,
} from "@/lib/household-date-format";
import { parseTherapyOccurredAtFromForm } from "@/lib/therapy/occurred-at-form";

test("To date includes a treatment later the same Israel day", () => {
  const end = inclusiveEndOfIsraelCalendarDay("2026-09-30");
  const treatment = parseTherapyOccurredAtFromForm("2026-09-30", "14:00");
  assert.ok(end);
  assert.ok(treatment);
  assert.ok(treatment.getTime() <= end.getTime());
});

test("To date excludes a treatment on the next Israel calendar day", () => {
  const end = inclusiveEndOfIsraelCalendarDay("2026-09-30");
  const nextMorning = parseTherapyOccurredAtFromForm("2026-10-01", "00:30");
  assert.ok(end);
  assert.ok(nextMorning);
  assert.ok(nextMorning.getTime() > end.getTime());
});

test("To date includes a date-only treatment stored at UTC midnight", () => {
  const end = inclusiveEndOfIsraelCalendarDay("2026-09-30");
  const treatment = parseTherapyOccurredAtFromForm("2026-09-30", "");
  assert.ok(end);
  assert.ok(treatment);
  assert.ok(treatment.getTime() <= end.getTime());
});

test("To date covers the full winter day in Israel (UTC+2)", () => {
  const end = inclusiveEndOfIsraelCalendarDay("2026-01-15");
  const evening = parseTherapyOccurredAtFromForm("2026-01-15", "23:30");
  const nextMorning = parseTherapyOccurredAtFromForm("2026-01-16", "00:15");
  assert.ok(end);
  assert.ok(evening);
  assert.ok(nextMorning);
  assert.ok(evening.getTime() <= end.getTime());
  assert.ok(nextMorning.getTime() > end.getTime());
});

test("inclusiveEndOfIsraelCalendarDay rejects impossible dates", () => {
  assert.equal(inclusiveEndOfIsraelCalendarDay("2026-02-31"), null);
  assert.equal(inclusiveEndOfIsraelCalendarDay(""), null);
  assert.equal(inclusiveEndOfIsraelCalendarDay("30/09/2026"), null);
});

test("parseToDateAsEndOfIsraelDay matches the inclusive Israel day end", () => {
  const end = parseToDateAsEndOfIsraelDay("2026-09-30");
  assert.ok(end);
  assert.equal(end.toISOString(), inclusiveEndOfIsraelCalendarDay("2026-09-30")?.toISOString());
  const afternoon = parseTherapyOccurredAtFromForm("2026-09-30", "14:00");
  assert.ok(afternoon);
  assert.ok(afternoon.getTime() <= end.getTime());
});

test("UTC To date includes a timestamp later that UTC day and excludes the next day", () => {
  const end = parseToDateAsEndOfUtcDay("2026-09-30");
  assert.ok(end);
  assert.equal(end.toISOString(), "2026-09-30T23:59:59.999Z");
  assert.ok(new Date("2026-09-30T14:00:00.000Z").getTime() <= end.getTime());
  assert.ok(new Date("2026-10-01T00:00:00.000Z").getTime() > end.getTime());
});
