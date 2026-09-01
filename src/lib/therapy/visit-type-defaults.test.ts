import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveTherapyVisitTypeDefault,
  resolveTreatmentFeePrefill,
  type VisitTypeDefaultRow,
} from "@/lib/therapy/visit-type-defaults";

const defaults: VisitTypeDefaultRow[] = [
  { job_id: "job-1", program_id: null, visit_type: "clinic", amount: "250", currency: "ILS" },
  { job_id: "job-1", program_id: "prog-1", visit_type: "clinic", amount: "300", currency: "ILS" },
  { job_id: "job-1", program_id: null, visit_type: "home", amount: "400", currency: "ILS" },
];

test("resolveTherapyVisitTypeDefault prefers program-specific amount", () => {
  const resolved = resolveTherapyVisitTypeDefault(defaults, "job-1", "prog-1", "clinic");
  assert.deepEqual(resolved, { amount: "300", currency: "ILS" });
});

test("resolveTherapyVisitTypeDefault falls back to job-level amount", () => {
  const resolved = resolveTherapyVisitTypeDefault(defaults, "job-1", "", "home");
  assert.deepEqual(resolved, { amount: "400", currency: "ILS" });
});

test("resolveTreatmentFeePrefill uses agreed fee over visit defaults", () => {
  const resolved = resolveTreatmentFeePrefill({
    agreedFeeAmount: "180",
    agreedFeeCurrency: "USD",
    visitDefaults: defaults,
    jobId: "job-1",
    programId: "prog-1",
    visitType: "clinic",
  });
  assert.deepEqual(resolved, { amount: "180", currency: "USD" });
});

test("resolveTreatmentFeePrefill uses visit default when agreed fee is empty", () => {
  const resolved = resolveTreatmentFeePrefill({
    agreedFeeAmount: "  ",
    agreedFeeCurrency: null,
    visitDefaults: defaults,
    jobId: "job-1",
    programId: null,
    visitType: "clinic",
  });
  assert.deepEqual(resolved, { amount: "250", currency: "ILS" });
});
