import assert from "node:assert/strict";
import test from "node:test";
import { fiveMinuteClockOptions } from "@/lib/therapy/clock-minutes";

test("fiveMinuteClockOptions lists 5-minute steps from 00 through 55", () => {
  assert.deepEqual(fiveMinuteClockOptions(), [
    "00",
    "05",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ]);
});

test("fiveMinuteClockOptions keeps an existing off-grid minute", () => {
  assert.deepEqual(fiveMinuteClockOptions("07"), [
    "00",
    "05",
    "07",
    "10",
    "15",
    "20",
    "25",
    "30",
    "35",
    "40",
    "45",
    "50",
    "55",
  ]);
});
