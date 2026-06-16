import Link from "next/link";
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
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import {
  listAppointmentsForHousehold,
  parseAppointmentListStatusFilter,
  sortAppointmentListRows,
  type AppointmentListStatusFilter,
} from "@/lib/therapy/series-occurrences";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
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
  searchParams?: Promise<{ status?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const sp = searchParams ? await searchParams : {};
  const statusFilter = parseAppointmentListStatusFilter(sp.status);

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

  const rows = sortAppointmentListRows(
    await listAppointmentsForHousehold({
      householdId,
      jobWhere: jobScope,
      statusFilter,
    }),
    now,
    statusFilter,
  );

  const actionLabels = {
    edit: ap.edit,
    logTreatment: ap.logTreatment,
    reschedule: ap.reschedule,
    cancel: ap.cancel,
  };

  const showStatusColumn = statusFilter !== "scheduled";

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

      <form
        method="get"
        className="flex flex-wrap items-end gap-x-2 gap-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3 sm:gap-x-3 sm:p-4"
      >
        <div className="min-w-0 flex-1 basis-[12rem]">
          <label className="mb-1 block text-xs text-slate-400">{ap.filterStatusLabel}</label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-normal text-slate-100"
          >
            <option value="scheduled">{ap.filterStatusScheduled}</option>
            <option value="all">{ap.filterStatusAll}</option>
            <option value="completed">{ap.filterStatusCompleted}</option>
            <option value="cancelled">{ap.filterStatusCancelled}</option>
          </select>
        </div>
        <div className="flex shrink-0 items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-normal text-slate-100 hover:bg-slate-600"
          >
            {c.apply}
          </button>
          {statusFilter !== "scheduled" ? (
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
