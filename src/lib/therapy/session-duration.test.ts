import assert from "node:assert/strict";
import test from "node:test";
import { resolveSessionDurationMinutes } from "@/lib/therapy/session-duration";

test("resolveSessionDurationMinutes applies fallback/override order", () => {
  const resolved = resolveSessionDurationMinutes({
    systemDefaultMinutes: 45,
    jobDefaultMinutes: 50,
    programDefaultMinutes: 55,
    appointmentDurationMinutes: 60,
  });
  assert.equal(resolved, 60);
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
