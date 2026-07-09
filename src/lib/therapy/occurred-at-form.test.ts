import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultOccurredTimeInputValue,
  parseTherapyOccurredAtFromForm,
} from "@/lib/therapy/occurred-at-form";
import { getDateTimePartsInIsraelTime } from "@/lib/household-date-format";

test("parseTherapyOccurredAtFromForm stores date-only as UTC midnight", () => {
  const d = parseTherapyOccurredAtFromForm("2026-07-08", "");
  assert.ok(d);
  assert.equal(d!.toISOString(), "2026-07-08T00:00:00.000Z");
});

test("parseTherapyOccurredAtFromForm interprets time as Israel (Asia/Jerusalem)", () => {
  const d = parseTherapyOccurredAtFromForm("2026-07-08", "16:30");
  assert.ok(d);
  const parts = getDateTimePartsInIsraelTime(d!);
  assert.equal(parts.year, 2026);
  assert.equal(parts.month, 7);
  assert.equal(parts.day, 8);
  assert.equal(parts.hour, 16);
  assert.equal(parts.minute, 30);
});

test("defaultOccurredTimeInputValue returns empty for date-only rows", () => {
  const d = new Date("2026-07-08T00:00:00.000Z");
  assert.equal(defaultOccurredTimeInputValue(d), "");
});

test("defaultOccurredTimeInputValue shows Israel wall-clock time", () => {
  const d = parseTherapyOccurredAtFromForm("2026-07-08", "16:30");
  assert.ok(d);
  assert.equal(defaultOccurredTimeInputValue(d!), "16:30");
});
