import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createTherapyAppointment,
  createTherapyAppointmentSeries,
  deleteTherapyAppointmentSeries,
  updateTherapyAppointmentStatus,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

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
  const dow = [
    { v: 0, l: "Sunday" },
    { v: 1, l: "Monday" },
    { v: 2, l: "Tuesday" },
    { v: 3, l: "Wednesday" },
    { v: 4, l: "Thursday" },
    { v: 5, l: "Friday" },
    { v: 6, l: "Saturday" },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">One-off appointment</h2>
        <form
          action={createTherapyAppointment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="client_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name ?? ""}
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
            <option value="">Program (optional)</option>
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
                {v}
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
            Schedule
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Recurring series</h2>
        <form
          action={createTherapyAppointmentSeries}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select name="client_id" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name ?? ""}
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
            <option value="">Program (optional)</option>
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
                {v}
              </option>
            ))}
          </select>
          <select
            name="recurrence"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every 2 weeks</option>
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
            Create series &amp; generate
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Recurring rules</h2>
        {series.length === 0 ? (
          <p className="text-sm text-slate-500">None.</p>
        ) : (
          <ul className="space-y-2">
            {series.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
              >
                <span>
                  {s.client.first_name} — {s.job.job_title} — {s.recurrence} — DOW {s.day_of_week}
                </span>
                <form action={deleteTherapyAppointmentSeries}>
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="text-xs text-rose-400">
                    Delete series
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming appointments.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">Start</th>
                  <th className="px-3 py-2 text-slate-300">Client</th>
                  <th className="px-3 py-2 text-slate-300">Job</th>
                  <th className="px-3 py-2 text-slate-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => (
                  <tr key={a.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                      {a.start_at.toISOString().slice(0, 16).replace("T", " ")}
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
                          <option value="scheduled">scheduled</option>
                          <option value="cancelled">cancelled</option>
                          <option value="completed">completed</option>
                        </select>
                        <button type="submit" className="text-xs text-sky-400">
                          Set
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
