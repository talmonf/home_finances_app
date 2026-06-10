import Link from "next/link";
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
import { getUpcomingAppointmentsForHousehold } from "@/lib/therapy/series-occurrences";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { AppointmentRowActions } from "./appointment-row-actions";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

export default async function AppointmentsPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

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

  const upcoming = await getUpcomingAppointmentsForHousehold({
    householdId,
    jobWhere: jobScope,
    take: 100,
  });

  const futureAppointments = upcoming.filter((a) => a.status === "scheduled" && a.startAt >= now);
  const pastAppointments = upcoming
    .filter((a) => a.status === "scheduled" && a.startAt < now)
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  const actionLabels = {
    edit: ap.edit,
    logTreatment: ap.logTreatment,
    reschedule: ap.reschedule,
    cancel: ap.cancel,
  };

  const renderAppointmentsTable = (appointments: typeof upcoming) => (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80">
            <th className="px-3 py-2 text-slate-300">{ap.startCol}</th>
            <th className="px-3 py-2 text-slate-300">{c.client}</th>
            <th className="px-3 py-2 text-slate-300">{c.job}</th>
            <th className="px-3 py-2 text-slate-300">{ap.visitTypeCol}</th>
            <th className="px-3 py-2 text-slate-300">{ap.actionsCol}</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
            <tr
              key={a.id ?? `virtual-${a.seriesId}-${a.occurrenceDate}`}
              className="border-b border-slate-700/80"
            >
              <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                {formatHouseholdDateUtcWithTime(a.startAt, dateDisplayFormat)}
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
              <td className="px-3 py-2">
                <AppointmentRowActions listBase={LIST} labels={actionLabels} row={a} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">{ap.upcoming}</h2>
        <Link
          href={`${LIST}/new`}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {ap.addAppointment}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500">{ap.noUpcoming}</p>
      ) : (
        <div className="space-y-4">
          {futureAppointments.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">{ap.upcoming}</h3>
              {renderAppointmentsTable(futureAppointments)}
            </section>
          ) : null}

          {pastAppointments.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">{ap.pastScheduled}</h3>
              {renderAppointmentsTable(pastAppointments)}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
