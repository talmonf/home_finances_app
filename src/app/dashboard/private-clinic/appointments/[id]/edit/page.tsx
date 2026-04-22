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
  reportTreatmentFromAppointment,
} from "../../../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { dateToDatetimeLocalValue, formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { AppointmentEditFormClient } from "./appointment-edit-form-client";

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
      participants: true,
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

      <AppointmentEditFormClient
        action={updateTherapyAppointment}
        id={apt.id}
        redirectOnSuccess={redirectOnSuccess}
        initialJobId={apt.job_id}
        initialProgramId={apt.program_id ?? ""}
        initialClientId={apt.client_id}
        initialAdditionalClientIds={apt.participants.map((p) => p.client_id)}
        initialVisitType={apt.visit_type}
        initialStatus={apt.status}
        initialCancellationReason={apt.cancellation_reason ?? ""}
        initialEndAt={apt.end_at ? dateToDatetimeLocalValue(apt.end_at) : ""}
        labels={{
          client: c.client,
          programOptional: ap.programOptional,
          statusScheduled: ap.statusScheduled,
          statusCompleted: ap.statusCompleted,
          statusCancelled: ap.statusCancelled,
          cancel: ap.cancel,
          save: ap.save,
        }}
        jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
        programs={programs.map((p) => ({ id: p.id, jobId: p.job_id, label: p.name }))}
        clients={clients.map((cl) => ({ id: cl.id, label: `${cl.first_name} ${cl.last_name ?? ""}`.trim() }))}
        visitOptions={visitOptions}
      />
      <p className="text-xs text-slate-500">
        {ap.startCol}: {formatHouseholdDateUtcWithTime(apt.start_at, dateDisplayFormat)} —{" "}
        <Link href={`${LIST}/${apt.id}/reschedule`} className="text-sky-400 hover:text-sky-300">
          {ap.reschedule}
        </Link>
      </p>

      <form
        action={reportTreatmentFromAppointment}
        className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
      >
        <input type="hidden" name="appointment_id" value={apt.id} />
        <h3 className="md:col-span-2 text-sm font-semibold text-slate-200">Report treatment from appointment</h3>
        <input
          name="amount"
          placeholder="Amount"
          required
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <input
          name="currency"
          defaultValue="ILS"
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
        <textarea name="note_1" placeholder="Note 1" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2" />
        <select name="additional_participant_ids" multiple className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2">
          {clients.map((cl) => (
            <option key={cl.id} value={cl.id}>
              {cl.first_name} {cl.last_name ?? ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="w-fit rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          Report Treatment
        </button>
      </form>
    </div>
  );
}
