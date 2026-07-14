import Link from "next/link";
import { HouseholdDateField } from "@/components/household-date-field";
import { PrivateClinicFilterResetButton } from "@/components/private-clinic-filter-reset-button";
import {
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
  prisma,
} from "@/lib/auth";
import { formatClientNameForDisplay } from "@/lib/privacy-display";
import { privateClinicAppointments, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { redirect } from "next/navigation";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import {
  type AppointmentListStatusFilter,
} from "@/lib/therapy/series-occurrences";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import {
  appointmentsListHasActiveFilters,
  loadAppointmentListRows,
  parseAppointmentListFilters,
} from "./appointments-list-data";
import { AppointmentRowActions } from "./appointment-row-actions";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

function appointmentStatusLabel(
  ap: ReturnType<typeof privateClinicAppointments>,
  status: AppointmentListStatusFilter | "scheduled" | "completed" | "cancelled",
) {
  switch (status) {
    case "completed":
      return ap.statusCompleted;
    case "cancelled":
      return ap.statusCancelled;
    default:
      return ap.statusScheduled;
  }
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    job?: string;
    client?: string;
    from?: string;
    to?: string;
    created?: string;
    updated?: string;
    series?: string;
    warn?: string;
  }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const sp = searchParams ? await searchParams : {};
  const filters = parseAppointmentListFilters(sp);
  const googleSyncFailed = sp.warn === "google-sync";

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);
  const now = new Date();

  const [jobs, clients, rows] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
        includeJobIds: filters.job ? [filters.job] : [],
      }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
        OR: [{ is_active: true }, ...(filters.client ? [{ id: filters.client }] : [])],
      },
      orderBy: [{ first_name: "asc" }, { last_name: "asc" }, { id: "asc" }],
    }),
    loadAppointmentListRows({
      householdId,
      jobWhere: jobScope,
      filters,
      now,
    }),
  ]);

  const actionLabels = {
    edit: ap.edit,
    logTreatment: ap.logTreatment,
    reschedule: ap.reschedule,
    cancel: ap.cancel,
  };

  const showStatusColumn = filters.status !== "scheduled";
  const hasActiveFilters = appointmentsListHasActiveFilters(filters);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.pageTitle}</h2>
        <Link
          href={`${LIST}/new`}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ap.addAppointment}
        </Link>
      </div>

      {googleSyncFailed ? (
        <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
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

      <form
        method="get"
        className="flex flex-wrap items-end gap-x-2 gap-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3 sm:gap-x-3 sm:p-4"
      >
        <div className="w-[8.5rem] shrink-0">
          <label className="mb-1 block text-xs text-slate-400">{ap.filterStatusLabel}</label>
          <select
            name="status"
            defaultValue={filters.status}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-normal text-slate-100"
          >
            <option value="scheduled">{ap.filterStatusScheduled}</option>
            <option value="all">{ap.filterStatusAll}</option>
            <option value="completed">{ap.filterStatusCompleted}</option>
            <option value="cancelled">{ap.filterStatusCancelled}</option>
          </select>
        </div>
        <div className="min-w-0 max-w-xs grow-0 basis-[11.5rem]">
          <label className="mb-1 block text-xs text-slate-400">{c.job}</label>
          <select
            name="job"
            defaultValue={filters.job}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-normal text-slate-100"
          >
            <option value="">{c.any}</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {formatJobDisplayLabel(job)}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 max-w-xs grow-0 basis-[11.5rem]">
          <label className="mb-1 block text-xs text-slate-400">{c.client}</label>
          <select
            name="client"
            defaultValue={filters.client}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-normal text-slate-100"
          >
            <option value="">{c.any}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {formatClientNameForDisplay(obfuscate, client.first_name, client.last_name)}
                {!client.is_active ? ` (${c.inactive})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="w-[11.25rem] shrink-0">
          <label className="mb-1 block text-xs text-slate-400">{c.from}</label>
          <HouseholdDateField
            name="from"
            defaultIsoYmd={filters.from}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-normal text-slate-100"
          />
        </div>
        <div className="w-[11.25rem] shrink-0">
          <label className="mb-1 block text-xs text-slate-400">{c.to}</label>
          <HouseholdDateField
            name="to"
            defaultIsoYmd={filters.to}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm font-normal text-slate-100"
          />
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-normal text-slate-100 hover:bg-slate-600"
          >
            {c.apply}
          </button>
          {hasActiveFilters ? (
            <PrivateClinicFilterResetButton href={LIST} label={c.filterReset} />
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">{ap.noAppointments}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-3 py-2 text-slate-300">{ap.startCol}</th>
                <th className="px-3 py-2 text-slate-300">{c.client}</th>
                <th className="px-3 py-2 text-slate-300">{c.job}</th>
                <th className="px-3 py-2 text-slate-300">{ap.visitTypeCol}</th>
                {showStatusColumn ? (
                  <th className="px-3 py-2 text-slate-300">{ap.statusCol}</th>
                ) : null}
                <th className="px-3 py-2 text-slate-300">{ap.actionsCol}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const isOverdue = a.status === "scheduled" && a.startAt < now;
                return (
                  <tr
                    key={a.id ?? `virtual-${a.seriesId}-${a.occurrenceDate}`}
                    className={
                      isOverdue
                        ? "border-b border-slate-700/80 bg-rose-950/25 hover:bg-rose-950/35"
                        : "border-b border-slate-700/80 hover:bg-slate-800/50"
                    }
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                      <span className="font-medium text-slate-100">
                        {formatHouseholdDateUtcWithTime(a.startAt, dateDisplayFormat)}
                      </span>
                      {isOverdue ? (
                        <span className="ms-2 rounded bg-rose-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                          {ap.overdue}
                        </span>
                      ) : null}
                      {a.kind === "virtual" ? (
                        <span className="ml-2 text-xs text-amber-400/80">↻</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-slate-100">
                      {a.client
                        ? formatClientNameForDisplay(obfuscate, a.client.first_name, a.client.last_name)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {a.job ? formatJobDisplayLabel({ job_title: a.job.job_title, employer_name: null }) : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {therapyVisitTypeLabel(uiLanguage, a.visitType)}
                    </td>
                    {showStatusColumn ? (
                      <td className="px-3 py-2 text-slate-400">
                        {appointmentStatusLabel(ap, a.status)}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <AppointmentRowActions listBase={LIST} labels={actionLabels} row={a} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
