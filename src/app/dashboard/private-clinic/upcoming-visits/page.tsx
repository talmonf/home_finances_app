import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicCommon, privateClinicUpcomingVisits } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { dateOnlyLocal, startOfTodayLocal } from "@/lib/private-clinic/reminders-logic";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";

export const dynamic = "force-dynamic";

export default async function UpcomingVisitsPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const uv = privateClinicUpcomingVisits(uiLanguage);

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const clients = await prisma.therapy_clients.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      visits_per_period_count: { not: null },
      visits_per_period_weeks: { not: null },
      ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }, { id: "asc" }],
    include: {
      default_job: true,
      default_program: true,
    },
  });

  const clientIds = clients.map((x) => x.id);
  const lastTreatmentRows =
    clientIds.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: {
            household_id: householdId,
            client_id: { in: clientIds },
          },
          _max: { occurred_at: true },
        })
      : [];

  const lastVisitAtByClientId = new Map(
    lastTreatmentRows.map((row) => [row.client_id, row._max.occurred_at]),
  );

  const today = startOfTodayLocal();

  type ScheduledRow = {
    clientId: string;
    name: string;
    jobLabel: string;
    programLabel: string;
    lastVisit: Date;
    nextDue: Date;
    isOverdue: boolean;
    isDueToday: boolean;
  };

  const scheduled: ScheduledRow[] = [];
  const needsFirstVisit: typeof clients = [];

  for (const row of clients) {
    const vc = row.visits_per_period_count;
    const vw = row.visits_per_period_weeks;
    if (vc == null || vw == null) continue;

    const lastAt = lastVisitAtByClientId.get(row.id);
    if (!lastAt) {
      needsFirstVisit.push(row);
      continue;
    }

    const nextDue = nextVisitDueDateAfterLastTreatment(lastAt, vc, vw);
    const nextDay = dateOnlyLocal(nextDue);
    const isOverdue = nextDay.getTime() < today.getTime();
    const isDueToday = nextDay.getTime() === today.getTime();

    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.first_name;
    scheduled.push({
      clientId: row.id,
      name,
      jobLabel: formatJobDisplayLabel(row.default_job),
      programLabel: row.default_program?.name ?? c.none,
      lastVisit: lastAt,
      nextDue,
      isOverdue,
      isDueToday,
    });
  }

  scheduled.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

  const treatmentsBase = "/dashboard/private-clinic/treatments";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-slate-200">{uv.pageTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{uv.pageIntro}</p>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-slate-500">{uv.empty}</p>
      ) : (
        <>
          {scheduled.length > 0 ? (
            <section className="space-y-3">
              <div className="overflow-x-auto rounded-xl border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700 text-sm">
                  <thead className="bg-slate-900/80">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colNextDue}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colClient}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colLastVisit}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colJob}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colProgram}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colActions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                    {scheduled.map((r) => (
                      <tr
                        key={r.clientId}
                        className={
                          r.isOverdue
                            ? "bg-rose-950/25 hover:bg-rose-950/35"
                            : r.isDueToday
                              ? "bg-amber-950/20 hover:bg-amber-950/30"
                              : "hover:bg-slate-800/50"
                        }
                      >
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="font-medium text-slate-100">
                            {formatHouseholdDate(r.nextDue, dateDisplayFormat)}
                          </span>
                          {r.isOverdue ? (
                            <span className="ml-2 rounded bg-rose-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                              {uv.overdue}
                            </span>
                          ) : r.isDueToday ? (
                            <span className="ml-2 rounded bg-amber-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-950">
                              {uv.dueToday}
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                          {obfuscate ? OBFUSCATED : r.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                          {formatHouseholdDate(r.lastVisit, dateDisplayFormat)}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-2 text-slate-300" title={r.jobLabel}>
                          {r.jobLabel}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={r.programLabel}>
                          {r.programLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <Link
                            href={`${treatmentsBase}?client=${encodeURIComponent(r.clientId)}`}
                            className="font-medium text-sky-400 hover:text-sky-300"
                          >
                            {uv.logTreatment}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {needsFirstVisit.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-medium text-slate-300">{uv.sectionNeedsFirstVisit}</h3>
              <p className="text-xs text-slate-500">{uv.sectionNeedsFirstVisitHint}</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
                {needsFirstVisit.map((row) => {
                  const name =
                    [row.first_name, row.last_name].filter(Boolean).join(" ") || row.first_name;
                  return (
                    <li key={row.id}>
                      <span>{obfuscate ? OBFUSCATED : name}</span>
                      {" — "}
                      <Link
                        href={`${treatmentsBase}?client=${encodeURIComponent(row.id)}`}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {uv.logTreatment}
                      </Link>
                      {" · "}
                      <Link
                        href={`/dashboard/private-clinic/clients/${row.id}/edit`}
                        className="text-sky-400/90 hover:text-sky-300"
                      >
                        {uv.editClient}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
