import assert from "node:assert/strict";
import test from "node:test";
import { isClinicModulePath } from "@/lib/app-module-path";

test("home finance routes are not the clinic module", () => {
  assert.equal(isClinicModulePath("/", true), false);
  assert.equal(isClinicModulePath("/dashboard/subscriptions", true), false);
  assert.equal(isClinicModulePath("/dashboard/cars/abc", true), false);
});

test("private clinic routes are the clinic module", () => {
  assert.equal(isClinicModulePath("/dashboard/private-clinic", true), true);
  assert.equal(isClinicModulePath("/dashboard/private-clinic/clients", false), true);
});

test("shared calendar counts as clinic only when clinic is enabled", () => {
  assert.equal(isClinicModulePath("/dashboard/calendar", true), true);
  assert.equal(isClinicModulePath("/dashboard/calendar/week", true), true);
  assert.equal(isClinicModulePath("/dashboard/calendar", false), false);
});
