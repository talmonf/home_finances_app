import assert from "node:assert/strict";
import test from "node:test";
import { logTreatmentHref, upcomingVisitLogTreatmentTarget } from "@/lib/therapy/log-treatment";

test("logTreatmentHref opens the treatments modal with appointment context", () => {
  assert.equal(
    logTreatmentHref({
      clientId: "client-1",
      appointmentId: "appt-1",
      from: "appointments",
    }),
    "/dashboard/private-clinic/treatments?modal=new&client=client-1&appointment=appt-1&returnTo=appointments",
  );
});

test("upcomingVisitLogTreatmentTarget opens the treatments modal for a real appointment", () => {
  const target = upcomingVisitLogTreatmentTarget("client-1", {
    id: "appt-1",
    seriesId: null,
    occurrenceDate: null,
  });
  assert.equal(target.kind, "appointment");
  if (target.kind !== "appointment") return;
  assert.equal(target.appointmentId, "appt-1");
  assert.equal(
    target.href,
    "/dashboard/private-clinic/treatments?modal=new&client=client-1&appointment=appt-1&returnTo=upcoming",
  );
});

test("upcomingVisitLogTreatmentTarget materializes a virtual series occurrence", () => {
  const target = upcomingVisitLogTreatmentTarget("client-1", {
    id: null,
    seriesId: "series-1",
    occurrenceDate: "2026-09-02",
  });
  assert.deepEqual(target, {
    kind: "series-occurrence",
    seriesId: "series-1",
    occurrenceDate: "2026-09-02",
  });
});

test("upcomingVisitLogTreatmentTarget opens the treatments modal without an appointment", () => {
  const target = upcomingVisitLogTreatmentTarget("client-1", null);
  assert.equal(target.kind, "standalone");
  if (target.kind !== "standalone") return;
  assert.equal(
    target.href,
    "/dashboard/private-clinic/treatments?modal=new&client=client-1&returnTo=upcoming",
  );
});
