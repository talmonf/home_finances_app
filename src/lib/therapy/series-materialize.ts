import { prisma } from "@/lib/auth";

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function combineDateWithTime(dateOnly: Date, timeOfDay: Date): Date {
  const t = new Date(timeOfDay);
  const x = new Date(dateOnly);
  x.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
  return x;
}

function firstOccurrenceOnOrAfter(start: Date, dayOfWeek: number): Date {
  const s = stripTime(start);
  const current = s.getDay();
  const diff = (dayOfWeek - current + 7) % 7;
  return addDays(s, diff);
}

/**
 * Creates scheduled appointments for a recurring series within the horizon.
 * Removes future scheduled rows for this series first to avoid duplicates.
 */
export async function materializeSeriesAppointments(params: {
  householdId: string;
  seriesId: string;
  horizonMonths?: number;
}) {
  const { householdId, seriesId, horizonMonths = 6 } = params;

  const series = await prisma.therapy_appointment_series.findFirst({
    where: { id: seriesId, household_id: householdId },
  });
  if (!series || !series.is_active) return { created: 0 };

  const now = new Date();

  await prisma.therapy_appointments.deleteMany({
    where: {
      series_id: seriesId,
      household_id: householdId,
      status: "scheduled",
      start_at: { gte: now },
    },
  });

  const startBound = stripTime(new Date(series.start_date));
  const seriesEnd = series.end_date ? stripTime(new Date(series.end_date)) : null;
  const horizonEnd = stripTime(addMonths(now, horizonMonths));
  const lastDate =
    seriesEnd != null && seriesEnd < horizonEnd ? seriesEnd : horizonEnd;

  if (lastDate < startBound) return { created: 0 };

  const step = series.recurrence === "biweekly" ? 14 : 7;
  let d = firstOccurrenceOnOrAfter(startBound, series.day_of_week);

  while (stripTime(d) < startBound) {
    d = addDays(d, step);
  }

  while (stripTime(d) < stripTime(now)) {
    d = addDays(d, step);
  }

  let created = 0;
  while (stripTime(d) <= lastDate) {
    const startAt = combineDateWithTime(d, series.time_of_day);
    await prisma.therapy_appointments.create({
      data: {
        id: crypto.randomUUID(),
        household_id: householdId,
        client_id: series.client_id,
        job_id: series.job_id,
        program_id: series.program_id,
        series_id: series.id,
        visit_type: series.visit_type,
        start_at: startAt,
        end_at: null,
        status: "scheduled",
      },
    });
    created += 1;
    d = addDays(d, step);
  }

  return { created };
}
