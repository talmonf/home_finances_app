export type LogTreatmentFrom = "upcoming" | "appointments";

export type UpcomingVisitAppointmentRef = {
  id: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
};

export type UpcomingVisitLogTreatmentTarget =
  | { kind: "appointment"; href: string; appointmentId: string }
  | { kind: "series-occurrence"; seriesId: string; occurrenceDate: string }
  | { kind: "standalone"; href: string };

const TREATMENTS_BASE = "/dashboard/private-clinic/treatments";

export function logTreatmentHref(opts: {
  clientId?: string | null;
  appointmentId?: string | null;
  from?: LogTreatmentFrom | null;
}): string {
  const qp = new URLSearchParams({ modal: "new" });
  if (opts.clientId) qp.set("client", opts.clientId);
  if (opts.appointmentId) qp.set("appointment", opts.appointmentId);
  if (opts.from) qp.set("returnTo", opts.from);
  return `${TREATMENTS_BASE}?${qp.toString()}`;
}

export function upcomingVisitLogTreatmentTarget(
  clientId: string,
  nextAppointment: UpcomingVisitAppointmentRef | null,
): UpcomingVisitLogTreatmentTarget {
  if (nextAppointment?.id) {
    return {
      kind: "appointment",
      appointmentId: nextAppointment.id,
      href: logTreatmentHref({
        clientId,
        appointmentId: nextAppointment.id,
        from: "upcoming",
      }),
    };
  }
  if (nextAppointment?.seriesId && nextAppointment.occurrenceDate) {
    return {
      kind: "series-occurrence",
      seriesId: nextAppointment.seriesId,
      occurrenceDate: nextAppointment.occurrenceDate,
    };
  }
  return {
    kind: "standalone",
    href: logTreatmentHref({ clientId, from: "upcoming" }),
  };
}
