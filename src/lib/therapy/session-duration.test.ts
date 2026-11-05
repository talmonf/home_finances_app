import assert from "node:assert/strict";
import test from "node:test";
import {
  positiveMinutesBetween,
  resolveSessionDurationMinutes,
} from "@/lib/therapy/session-duration";

test("resolveSessionDurationMinutes applies fallback/override order", () => {
  const resolved = resolveSessionDurationMinutes({
    systemDefaultMinutes: 45,
    jobDefaultMinutes: 50,
    programDefaultMinutes: 55,
    clientDefaultMinutes: 58,
    appointmentDurationMinutes: 60,
  });
  assert.equal(resolved, 60);
});

test("resolveSessionDurationMinutes uses client override before appointment", () => {
  const resolved = resolveSessionDurationMinutes({
    jobDefaultMinutes: 50,
    programDefaultMinutes: 55,
    clientDefaultMinutes: 58,
    appointmentDurationMinutes: null,
  });
  assert.equal(resolved, 58);
});

test("positiveMinutesBetween uses the clock span instead of a stale duration", () => {
  const start = new Date("2026-11-09T18:00:00");
  const end = new Date("2026-11-09T19:15:00");
  assert.equal(positiveMinutesBetween(start, end), 75);
});

test("positiveMinutesBetween rejects an end that is not after the start", () => {
  const start = new Date("2026-11-09T18:00:00");
  assert.equal(positiveMinutesBetween(start, start), null);
  assert.equal(positiveMinutesBetween(start, new Date("2026-11-09T17:00:00")), null);
});

test("resolveSessionDurationMinutes falls back to system when others are missing", () => {
  const resolved = resolveSessionDurationMinutes({
    systemDefaultMinutes: 45,
    jobDefaultMinutes: null,
    programDefaultMinutes: null,
    appointmentDurationMinutes: null,
  });
  assert.equal(resolved, 45);
});
