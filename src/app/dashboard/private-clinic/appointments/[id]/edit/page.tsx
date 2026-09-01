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
  privateClinicTreatments,
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
import { isoDateOnly } from "@/lib/therapy/series-occurrences";
import { logTreatmentHref } from "@/lib/therapy/log-treatment";
import { AppointmentEditFormClient } from "./appointment-edit-form-client";
import { EditSeriesRecurrenceForm } from "./edit-series-recurrence-form";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";
const UPCOMING_VISITS = "/dashboard/private-clinic/upcoming-visits";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; saved?: string; warn?: string; fromUpcoming?: string }>;
};

export default async function EditAppointmentPage({ params, searchParams }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const query = (await searchParams) ?? {};
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
  const tr = privateClinicTreatments(uiLanguage);

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
      treatment: true,
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

  const fromUpcoming = query.fromUpcoming === "1";
  const fromUpcomingQuery = fromUpcoming ? "?fromUpcoming=1" : "";
  const redirectOnSuccess = fromUpcoming
    ? `${LIST}/${id}/edit?fromUpcoming=1&saved=appointment`
    : `${LIST}/${id}/edit?saved=appointment`;
  const googleSyncFailed = query.warn === "google-sync";
  const treatmentSaved = query.saved === "1" || query.saved === "treatment";
  const appointmentSaved = query.saved === "appointment";
  const defaultDurationMinutes = String(
    apt.duration_minutes ??
      apt.client.default_session_length_minutes ??
      apt.program?.default_session_length_minutes ??
      apt.job.default_session_length_minutes ??
      50,
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href={fromUpcoming ? UPCOMING_VISITS : LIST} className="text-sm text-slate-400 hover:text-slate-200">
          {fromUpcoming ? ap.backToUpcomingVisits : ap.backToAppointments}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{ap.editTitle}</h2>
      </div>

      {apt.google_calendar_last_error ? (
        <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/90">
          <p className="font-medium">
            {ap.googleSeriesSyncError}: {apt.google_calendar_last_error}
          </p>
          <p className="mt-1 text-xs text-rose-100/80">{ap.googleSyncFailedHint}</p>
          <Link
            href="/dashboard/private-clinic/settings"
            className="mt-2 inline-block text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline"
          >
            {ap.googleSyncOpenSettings}
          </Link>
        </div>
      ) : null}

      {apt.series_id && apt.series ? (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium">{ap.partOfSeries}</p>
          {apt.series.google_calendar_last_error ? (
            <p className="mt-2 text-xs text-rose-200">
              {ap.googleSeriesSyncError}: {apt.series.google_calendar_last_error}
            </p>
          ) : null}
          <EditSeriesRecurrenceForm
            seriesId={apt.series_id}
            effectiveDate={
              apt.occurrence_date
                ? isoDateOnly(new Date(apt.occurrence_date))
                : isoDateOnly(apt.start_at)
            }
            initialRecurrence={apt.series.recurrence}
            initialDayOfWeek={apt.series.day_of_week}
            initialTimeOfDay={`${String(new Date(apt.series.time_of_day).getUTCHours()).padStart(2, "0")}:${String(new Date(apt.series.time_of_day).getUTCMinutes()).padStart(2, "0")}`}
            initialEndDate={apt.series.end_date ? isoDateOnly(new Date(apt.series.end_date)) : ""}
            initialDurationMinutes={String(apt.series.duration_minutes ?? defaultDurationMinutes)}
            redirectOnSuccess={redirectOnSuccess}
            dow={[
              { v: 0, label: uiLanguage === "he" ? "ראשון" : "Sunday" },
              { v: 1, label: uiLanguage === "he" ? "שני" : "Monday" },
              { v: 2, label: uiLanguage === "he" ? "שלישי" : "Tuesday" },
              { v: 3, label: uiLanguage === "he" ? "רביעי" : "Wednesday" },
              { v: 4, label: uiLanguage === "he" ? "חמישי" : "Thursday" },
              { v: 5, label: uiLanguage === "he" ? "שישי" : "Friday" },
              { v: 6, label: uiLanguage === "he" ? "שבת" : "Saturday" },
            ]}
            labels={{
              editRecurrence: ap.editRecurrence,
              editRecurrenceTitle: ap.editRecurrenceTitle,
              recurrence: ap.recurringRules,
              dayOfWeek: ap.dayOfWeek,
              timeOfDay: ap.timeOfDay,
              seriesEndDateOptional: ap.seriesEndDateOptional,
              durationMinutes: ap.durationMinutes,
              weekly: ap.weekly,
              biweekly: ap.biweekly,
              save: ap.save,
            }}
          />
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

      {treatmentSaved ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/90">
          {ap.reportTreatmentSaved}
        </div>
      ) : null}

      {appointmentSaved ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100/90">
          {c.saved}
        </div>
      ) : null}

      {googleSyncFailed ? (
        <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium">{ap.googleSyncFailedWarn}</p>
          <p className="mt-1 text-amber-100/90">{ap.googleSyncFailedHint}</p>
          <Link
            href="/dashboard/private-clinic/settings"
            className="mt-2 inline-block text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline"
          >
            {ap.googleSyncOpenSettings}
          </Link>
        </div>
      ) : null}

      {query.error === "linked" ? (
        <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/90">
          {ap.reportTreatmentBlocked}
        </div>
      ) : null}

      {query.error === "next_appt" ? (
        <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/90">
          {uiLanguage === "he"
            ? "לא ניתן לקבוע תור הבא — בדקו תאריך, שעה ומשך."
            : "Could not schedule next appointment — check date, time, and duration."}
        </div>
      ) : null}

      {query.error === "travel_amount" ? (
        <div className="rounded-xl border border-rose-700/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-100/90">
          {tr.treatmentTravelAmountError}
        </div>
      ) : null}

      <AppointmentEditFormClient
        action={updateTherapyAppointment}
        id={apt.id}
        redirectOnSuccess={redirectOnSuccess}
        initialJobId={apt.job_id}
        initialProgramId={apt.program_id ?? ""}
        initialClientId={apt.client_id}
        initialAdditionalClientIds={apt.participants
          .map((p) => p.client_id)
          .filter((participantClientId) => participantClientId !== apt.client_id)}
        initialVisitType={apt.visit_type}
        initialStatus={apt.status}
        initialCancellationReason={apt.cancellation_reason ?? ""}
        initialStartAt={dateToDatetimeLocalValue(apt.start_at)}
        initialEndAt={apt.end_at ? dateToDatetimeLocalValue(apt.end_at) : ""}
        initialDurationMinutes={apt.duration_minutes ? String(apt.duration_minutes) : ""}
        initialNote={apt.note ?? ""}
        labels={{
          client: c.client,
          job: c.job,
          additionalClients: ap.additionalClients,
          addAdditionalClient: ap.addAdditionalClient,
          remove: ap.remove,
          programOptional: ap.programOptional,
          visitType: ap.visitTypeCol,
          status: c.status,
          startDateTime: ap.startDateTime,
          endOptional: ap.endOptional,
          startDate: ap.startDate,
          startTime: ap.startTime,
          durationMinutes: ap.durationMinutes,
          cancellationReason: ap.cancellationReason,
          statusScheduled: ap.statusScheduled,
          statusCompleted: ap.statusCompleted,
          statusCancelled: ap.statusCancelled,
          note: ap.appointmentNote,
          save: ap.save,
        }}
        jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
        programs={programs.map((p) => ({ id: p.id, jobId: p.job_id, label: p.name }))}
        clients={clients.map((cl) => ({ id: cl.id, label: `${cl.first_name} ${cl.last_name ?? ""}`.trim() }))}
        visitOptions={visitOptions}
      />
      <p className="text-xs text-slate-500">
        {ap.startCol}: {formatHouseholdDateUtcWithTime(apt.start_at, dateDisplayFormat)}
        {apt.status === "scheduled" ? (
          <>
            {" — "}
            <Link href={`${LIST}/${apt.id}/reschedule${fromUpcomingQuery}`} className="text-sky-400 hover:text-sky-300">
              {ap.reschedule}
            </Link>
            {" · "}
            <Link href={`${LIST}/${apt.id}/cancel${fromUpcomingQuery}`} className="text-rose-400 hover:text-rose-300">
              {ap.cancel}
            </Link>
          </>
        ) : null}
      </p>

      {apt.status === "scheduled" ? (
      <section
        id="report-treatment"
        className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900/60 p-4"
      >
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-200">{ap.reportTreatmentTitle}</h3>
          <p className="text-xs text-slate-400">{ap.reportTreatmentHint}</p>
        </div>
        {apt.treatment_id ? (
          <div className="mt-3 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-3 text-sm text-amber-100/90">
            <p>{ap.reportTreatmentAlreadyLinked}</p>
            {apt.treatment ? (
              <Link
                href={`/dashboard/private-clinic/treatments?modal=edit&edit_id=${encodeURIComponent(apt.treatment.id)}`}
                className="mt-2 inline-flex text-xs text-amber-200 underline-offset-2 hover:underline"
              >
                {ap.viewLinkedTreatment}
              </Link>
            ) : null}
          </div>
        ) : (
          <Link
            href={logTreatmentHref({
              clientId: apt.client_id,
              appointmentId: apt.id,
              from: fromUpcoming ? "upcoming" : "appointments",
            })}
            className="mt-3 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            {ap.logTreatment}
          </Link>
        )}
      </section>
      ) : apt.status === "completed" && apt.treatment_id ? (
        <section className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-3 text-sm text-amber-100/90">
            <p>{ap.reportTreatmentAlreadyLinked}</p>
            {apt.treatment ? (
              <Link
                href={`/dashboard/private-clinic/treatments?modal=edit&edit_id=${encodeURIComponent(apt.treatment.id)}`}
                className="mt-2 inline-flex text-xs text-amber-200 underline-offset-2 hover:underline"
              >
                {ap.viewLinkedTreatment}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
