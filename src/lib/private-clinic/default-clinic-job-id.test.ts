import test from "node:test";
import assert from "node:assert/strict";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";

test("defaultClinicJobId keeps explicit selection", () => {
  assert.equal(defaultClinicJobId([{ id: "a" }, { id: "b" }], "b"), "b");
  assert.equal(defaultClinicJobId([{ id: "only" }], "other"), "other");
});

test("defaultClinicJobId uses sole job when explicit is omitted", () => {
  assert.equal(defaultClinicJobId([{ id: "only" }]), "only");
});

test("defaultClinicJobId keeps empty when explicit is empty", () => {
  assert.equal(defaultClinicJobId([{ id: "only" }], ""), "");
  assert.equal(defaultClinicJobId([{ id: "a" }, { id: "b" }], ""), "");
});

test("defaultClinicJobId returns empty when multiple jobs and no explicit", () => {
  assert.equal(defaultClinicJobId([{ id: "a" }, { id: "b" }]), "");
  assert.equal(defaultClinicJobId([]), "");
});
