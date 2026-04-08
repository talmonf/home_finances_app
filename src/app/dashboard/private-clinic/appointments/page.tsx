import { ConfirmDeleteForm } from "@/components/confirm-delete";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import {
  privateClinicAppointments,
  privateClinicCommon,
  weekdayLongLabel,
} from "@/lib/private-clinic-i18n";
import { formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { redirect } from "next/navigation";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
  deleteTherapyAppointmentSeries,
  updateTherapyAppointmentStatus,
} from "../actions";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);
  const now = new Date();

  const [jobs, programs, clients, upcoming, series] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId, is_active: true },
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { first_name: "asc" },
    }),
    prisma.therapy_appointments.findMany({
      where: {
        household_id: householdId,
        start_at: { gte: now },
        status: "scheduled",
      },
      orderBy: { start_at: "asc" },
      take: 100,
      include: { client: true, job: true },
    }),
    prisma.therapy_appointment_series.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
      include: { client: true, job: true },
    }),
  ]);

  const visitOptions = ["clinic", "home", "phone", "video"] as const;
  const dow = [0, 1, 2, 3, 4, 5, 6].map((v) => ({ v, l: weekdayLongLabel(uiLanguage, v) }));

  function recurrenceLabel(r: string): string {
    if (r === "weekly") return ap.weekly;
    if (r === "biweekly") return ap.biweekly;
    return r;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.oneOff}</h2>
        <form
          action={createTherapyAppointment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="client_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{c.client}</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.first_name} {cl.last_name ?? ""}
              </option>
            ))}
          </select>
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <select name="program_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{ap.programOptional}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.job.job_title} — {p.name}
              </option>
            ))}
          </select>
          <select
            name="visit_type"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {visitOptions.map((v) => (
              <option key={v} value={v}>
                {therapyVisitTypeLabel(uiLanguage, v)}
              </option>
            ))}
          </select>
          <input
            name="start_at"
            type="datetime-local"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="end_at"
            type="datetime-local"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {ap.schedule}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.recurringSeries}</h2>
        <form
          action={createTherapyAppointmentSeries}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select name="client_id" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{c.client}</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.first_name} {cl.last_name ?? ""}
              </option>
            ))}
          </select>
          <select name="job_id" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <select name="program_id" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{ap.programOptional}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.job.job_title} — {p.name}
              </option>
            ))}
          </select>
          <select
            name="visit_type"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {visitOptions.map((v) => (
              <option key={v} value={v}>
                {therapyVisitTypeLabel(uiLanguage, v)}
              </option>
            ))}
          </select>
          <select
            name="recurrence"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="weekly">{ap.weekly}</option>
            <option value="biweekly">{ap.biweekly}</option>
          </select>
          <select
            name="day_of_week"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {dow.map((d) => (
              <option key={d.v} value={d.v}>
                {d.l}
              </option>
            ))}
          </select>
          <input
            name="time_of_day"
            type="time"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="start_date"
            type="date"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input name="end_date" type="date" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {ap.createSeriesGenerate}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.recurringRules}</h2>
        {series.length === 0 ? (
          <p className="text-sm text-slate-500">{ap.noneShort}</p>
        ) : (
          <ul className="space-y-2">
            {series.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
              >
                <span>
                  {s.client.first_name} — {s.job.job_title} — {recurrenceLabel(s.recurrence)} —{" "}
                  {weekdayLongLabel(uiLanguage, s.day_of_week)}
                </span>
                <ConfirmDeleteForm action={deleteTherapyAppointmentSeries}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-rose-400">
                    {ap.deleteSeries}
                  </button>
                </ConfirmDeleteForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.upcoming}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">{ap.noUpcoming}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">{ap.startCol}</th>
                  <th className="px-3 py-2 text-slate-300">{c.client}</th>
                  <th className="px-3 py-2 text-slate-300">{c.job}</th>
                  <th className="px-3 py-2 text-slate-300">{c.status}</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => (
                  <tr key={a.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {formatHouseholdDateUtcWithTime(a.start_at, dateDisplayFormat)}
                    </td>
                    <td className="px-3 py-2 text-slate-100">{a.client.first_name}</td>
                    <td className="px-3 py-2 text-slate-400">{a.job.job_title}</td>
                    <td className="px-3 py-2">
                      <form action={updateTherapyAppointmentStatus} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={a.id} />
                        <select
                          name="status"
                          defaultValue={a.status}
                          className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                        >
                          <option value="scheduled">{ap.statusScheduled}</option>
                          <option value="cancelled">{ap.statusCancelled}</option>
                          <option value="completed">{ap.statusCompleted}</option>
                        </select>
                        <button type="submit" className="text-xs text-sky-400">
                          {ap.setStatus}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
