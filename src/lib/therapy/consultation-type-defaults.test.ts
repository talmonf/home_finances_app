import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveConsultationTypeDefault,
  type ConsultationTypeDefaultRow,
} from "@/lib/therapy/consultation-type-defaults";

const defaults: ConsultationTypeDefaultRow[] = [
  {
    job_id: "job-1",
    program_id: null,
    consultation_type_id: "type-supervision",
    amount: "200",
    currency: "ILS",
  },
  {
    job_id: "job-1",
    program_id: "prog-1",
    consultation_type_id: "type-supervision",
    amount: "350",
    currency: "ILS",
  },
  {
    job_id: "job-1",
    program_id: null,
    consultation_type_id: "type-initial",
    amount: "180",
    currency: "USD",
  },
];

test("resolveConsultationTypeDefault prefers program-specific amount", () => {
  const resolved = resolveConsultationTypeDefault(defaults, "job-1", "prog-1", "type-supervision");
  assert.deepEqual(resolved, { amount: "350", currency: "ILS" });
});

test("resolveConsultationTypeDefault falls back to job-level amount", () => {
  const resolved = resolveConsultationTypeDefault(defaults, "job-1", "", "type-initial");
  assert.deepEqual(resolved, { amount: "180", currency: "USD" });
});

test("resolveConsultationTypeDefault uses the job row when the program has no override", () => {
  const resolved = resolveConsultationTypeDefault(defaults, "job-1", "prog-1", "type-initial");
  assert.deepEqual(resolved, { amount: "180", currency: "USD" });
});

test("resolveConsultationTypeDefault returns null when nothing matches", () => {
  const resolved = resolveConsultationTypeDefault(defaults, "job-1", "prog-1", "type-missing");
  assert.equal(resolved, null);
});
