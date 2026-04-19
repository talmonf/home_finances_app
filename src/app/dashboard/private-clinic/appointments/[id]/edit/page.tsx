import Link from "next/link";
import { notFound } from "next/navigation";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import {
  privateClinicAppointments,
  privateClinicCommon,
} from "@/lib/private-clinic-i18n";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { redirect } from "next/navigation";
import {
  updateTherapyAppointment,
  endTherapyRecurringSeries,
  deleteTherapyAppointmentSeries,
} from "../../../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { dateToDatetimeLocalValue, formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditAppointmentPage({ params }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const uiLanguage = await getCurrentUiLanguage();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);

  const apt = await prisma.therapy_appointments.findFirst({
    where: {
      id,
      household_id: householdId,
      job: jobScope,
    },
    include: {
      client: true,
      job: true,
      program: true,
      series: true,
    },
  });

  if (!apt) notFound();

  const [jobs, programs, clients] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        job: jobScope,
      },
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
      },
      orderBy: { first_name: "asc" },
    }),
  ]);

  const visitOptions = (["clinic", "home", "phone", "video"] as const).map((v) => ({
    value: v,
    label: therapyVisitTypeLabel(uiLanguage, v),
  }));

  const redirectOnSuccess = `${LIST}/${id}/edit?saved=1`;

  return (
    <div className="space-y-8">
      <div>
        <Link href={LIST} className="text-sm text-slate-400 hover:text-slate-200">
          {ap.backToAppointments}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{ap.editTitle}</h2>
      </div>

      {apt.series_id && apt.series ? (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium">{ap.partOfSeries}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ConfirmDeleteForm
              action={endTherapyRecurringSeries}
              message={ap.endRecurringConfirm}
              className="inline"
            >
              <input type="hidden" name="series_id" value={apt.series_id} />
              <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
              <button
                type="submit"
                className="rounded-lg bg-amber-600/90 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-500"
              >
                {ap.endRecurring}
              </button>
            </ConfirmDeleteForm>
            <ConfirmDeleteForm
              action={deleteTherapyAppointmentSeries}
              message={ap.deleteEntireSeriesConfirm}
              className="inline"
            >
              <input type="hidden" name="id" value={apt.series_id} />
              <input type="hidden" name="redirect_on_success" value={LIST} />
              <button
                type="submit"
                className="rounded-lg border border-rose-500/60 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-950/50"
              >
                {ap.deleteEntireSeries}
              </button>
            </ConfirmDeleteForm>
          </div>
        </div>
      ) : null}

      <form
        action={updateTherapyAppointment}
        className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
      >
        <input type="hidden" name="id" value={apt.id} />
        <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
        <select
          name="client_id"
          required
          defaultValue={apt.client_id}
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
          defaultValue={apt.job_id}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {formatJobDisplayLabel(j)}
            </option>
          ))}
        </select>
        <select
          name="program_id"
          defaultValue={apt.program_id ?? ""}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="">{ap.programOptional}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {formatJobDisplayLabel(p.job)} — {p.name}
            </option>
          ))}
        </select>
        <select
          name="visit_type"
          required
          defaultValue={apt.visit_type}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {visitOptions.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          required
          defaultValue={apt.status}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          <option value="scheduled">{ap.statusScheduled}</option>
          <option value="completed">{ap.statusCompleted}</option>
          <option value="cancelled">{ap.statusCancelled}</option>
        </select>
        <input
          name="end_at"
          type="datetime-local"
          defaultValue={apt.end_at ? dateToDatetimeLocalValue(apt.end_at) : ""}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <p className="text-xs text-slate-500 md:col-span-2">
          {ap.startCol}: {formatHouseholdDateUtcWithTime(apt.start_at, dateDisplayFormat)} —{" "}
          <Link href={`${LIST}/${apt.id}/reschedule`} className="text-sky-400 hover:text-sky-300">
            {ap.reschedule}
          </Link>
        </p>
        <button
          type="submit"
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ap.save}
        </button>
      </form>
    </div>
  );
}
