import Link from "next/link";
import { PrivateClinicFilterResetButton } from "@/components/private-clinic-filter-reset-button";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { OBFUSCATED } from "@/lib/privacy-display";
import { privateClinicAppointments, privateClinicClients, privateClinicCommon, privateClinicUpcomingVisits } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { formatHouseholdDate, formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { dateOnlyLocal, startOfTodayLocal } from "@/lib/private-clinic/reminders-logic";
import { getUpcomingAppointmentsForHousehold, nextScheduledAppointmentByClientId } from "@/lib/therapy/series-occurrences";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";
import { LogTreatmentLink } from "./log-treatment-link";
import { UpcomingVisitAppointmentActions } from "./upcoming-visit-appointment-actions";

export const dynamic = "force-dynamic";

type NextAppointmentRef = {
  id: string | null;
  seriesId: string | null;
  occurrenceDate: string | null;
  startAt: Date;
};

function visitDueFlags(
  nextDue: Date,
  today: Date,
  now: Date,
  nextAppointment: NextAppointmentRef | null,
) {
  const nextDay = dateOnlyLocal(nextDue);
  const visitDueOverdue = nextDay.getTime() < today.getTime();
  const appointmentOverdue =
    nextAppointment != null && nextAppointment.startAt.getTime() < now.getTime();
  const isOverdue = visitDueOverdue || appointmentOverdue;
  const isDueToday = !visitDueOverdue && nextDay.getTime() === today.getTime();
  return { visitDueOverdue, appointmentOverdue, isOverdue, isDueToday };
}

export default async function UpcomingVisitsPage({
  searchParams,
}: {
  searchParams?: Promise<{ family?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const uv = privateClinicUpcomingVisits(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);
  const cl = privateClinicClients(uiLanguage);
  const familyLabel = uiLanguage === "he" ? "משפחה" : "Family";
  const anyFamilyLabel = uiLanguage === "he" ? "כל משפחה" : "Any family";

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const sp = searchParams ? await searchParams : {};
  const familyFilter = (sp.family ?? "").trim();

  const settings = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
    select: { family_therapy_enabled: true },
  });
  const families = settings?.family_therapy_enabled
    ? await prisma.therapy_families.findMany({
        where: { household_id: householdId },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }],
      })
    : [];

  const allActiveClients = await prisma.therapy_clients.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      ...(familyFilter ? { family_id: familyFilter } : {}),
      ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    },
    orderBy: [{ first_name: "asc" }, { last_name: "asc" }, { id: "asc" }],
    include: {
      default_job: true,
      default_program: true,
      family: true,
    },
  });

  const clients = allActiveClients.filter(
    (row) => row.visits_per_period_count != null && row.visits_per_period_weeks != null,
  );

  const today = startOfTodayLocal();
  const now = new Date();
  const allClientIds = allActiveClients.map((x) => x.id);
  const clientById = new Map(allActiveClients.map((row) => [row.id, row]));
  const allUpcoming =
    allClientIds.length > 0
      ? await getUpcomingAppointmentsForHousehold({
          householdId,
          clientIds: allClientIds,
        })
      : [];

  const nextAppointmentByClientId = nextScheduledAppointmentByClientId(allUpcoming);

  const clientIds = clients.map((x) => x.id);
  const lastTreatmentRows =
    allClientIds.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: {
            household_id: householdId,
            client_id: { in: allClientIds },
          },
          _max: { occurred_at: true },
        })
      : [];

  const lastVisitAtByClientId = new Map(
    lastTreatmentRows.map((row) => [row.client_id, row._max.occurred_at]),
  );

  type ScheduledRow = {
    clientId: string;
    name: string;
    jobLabel: string;
    programId: string | null;
    programLabel: string;
    kupatHolimLabel: string;
    lastVisit: Date | null;
    nextDue: Date;
    isOverdue: boolean;
    isDueToday: boolean;
    nextAppointment: NextAppointmentRef | null;
  };

  const scheduled: ScheduledRow[] = [];
  const needsFirstVisit: typeof clients = [];

  for (const row of clients) {
    const vc = row.visits_per_period_count;
    const vw = row.visits_per_period_weeks;
    if (vc == null || vw == null) continue;

    const lastAt = lastVisitAtByClientId.get(row.id);
    if (!lastAt) {
      if (!row.start_date) {
        needsFirstVisit.push(row);
        continue;
      }

      const nextDue = dateOnlyLocal(row.start_date);
      const nextAppointment = nextAppointmentByClientId.get(row.id) ?? null;
      const { isOverdue, isDueToday } = visitDueFlags(
        nextDue,
        today,
        now,
        nextAppointment,
      );

      const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.first_name;
      scheduled.push({
        clientId: row.id,
        name,
        jobLabel: formatJobDisplayLabel(row.default_job),
        programId: row.default_program_id,
        programLabel: row.default_program?.name ?? c.none,
        kupatHolimLabel:
          row.kupat_holim === "clalit"
            ? cl.kupatClalit
            : row.kupat_holim === "maccabi"
              ? cl.kupatMaccabi
              : row.kupat_holim === "meuhedet"
                ? cl.kupatMeuhedet
                : row.kupat_holim === "leumit"
                  ? cl.kupatLeumit
                  : c.none,
        lastVisit: null,
        nextDue,
        isOverdue,
        isDueToday,
        nextAppointment,
      });
      continue;
    }

    const nextDue = nextVisitDueDateAfterLastTreatment(lastAt, vc, vw);
    const nextAppointment = nextAppointmentByClientId.get(row.id) ?? null;
    const { isOverdue, isDueToday } = visitDueFlags(
      nextDue,
      today,
      now,
      nextAppointment,
    );

    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.first_name;
    scheduled.push({
      clientId: row.id,
      name,
      jobLabel: formatJobDisplayLabel(row.default_job),
      programId: row.default_program_id,
      programLabel: row.default_program?.name ?? c.none,
      kupatHolimLabel:
        row.kupat_holim === "clalit"
          ? cl.kupatClalit
          : row.kupat_holim === "maccabi"
            ? cl.kupatMaccabi
            : row.kupat_holim === "meuhedet"
              ? cl.kupatMeuhedet
              : row.kupat_holim === "leumit"
                ? cl.kupatLeumit
                : c.none,
      lastVisit: lastAt,
      nextDue,
      isOverdue,
      isDueToday,
      nextAppointment,
    });
  }

  const scheduledClientIds = new Set(scheduled.map((row) => row.clientId));
  for (const [clientId, nextAppointment] of nextAppointmentByClientId) {
    if (scheduledClientIds.has(clientId)) continue;
    const row = clientById.get(clientId);
    if (!row) continue;

    const nextDue = dateOnlyLocal(nextAppointment.startAt);
    const { isOverdue, isDueToday } = visitDueFlags(nextDue, today, now, nextAppointment);
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || row.first_name;
    scheduled.push({
      clientId: row.id,
      name,
      jobLabel: formatJobDisplayLabel(row.default_job),
      programId: row.default_program_id,
      programLabel: row.default_program?.name ?? c.none,
      kupatHolimLabel:
        row.kupat_holim === "clalit"
          ? cl.kupatClalit
          : row.kupat_holim === "maccabi"
            ? cl.kupatMaccabi
            : row.kupat_holim === "meuhedet"
              ? cl.kupatMeuhedet
              : row.kupat_holim === "leumit"
                ? cl.kupatLeumit
                : c.none,
      lastVisit: lastVisitAtByClientId.get(row.id) ?? null,
      nextDue,
      isOverdue,
      isDueToday,
      nextAppointment,
    });
  }

  scheduled.sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());

  const showScheduledColumn = scheduled.some((row) => row.nextAppointment != null);
  const showOverdueColumn = scheduled.some((row) => row.isOverdue);

  const treatmentsBase = "/dashboard/private-clinic/treatments";
  const appointmentNewBase = "/dashboard/private-clinic/appointments/new";
  const treatmentLogHref = (clientId: string, appointmentId?: string | null) => {
    const qp = new URLSearchParams({
      client: clientId,
      modal: "new",
    });
    if (appointmentId) qp.set("appointment", appointmentId);
    return `${treatmentsBase}?${qp.toString()}`;
  };

  const toDateLocalInput = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const scheduleAppointmentHref = (clientId: string, nextDue: Date, isOverdue: boolean) => {
    const client = clientById.get(clientId);
    const qp = new URLSearchParams({
      fromUpcoming: "1",
      client: clientId,
      job: client?.default_job_id ?? "",
      program: client?.default_program_id ?? "",
      visitType: client?.default_visit_type ?? "clinic",
      startDate: toDateLocalInput(isOverdue ? today : nextDue),
      durationMinutes: String(
        client?.default_program?.default_session_length_minutes ??
          client?.default_job?.default_session_length_minutes ??
          "",
      ),
    });
    return `${appointmentNewBase}?${qp.toString()}`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-slate-200">{uv.pageTitle}</h2>
        <p className="mt-1 text-sm text-slate-400">{uv.pageIntro}</p>
      </div>
      {settings?.family_therapy_enabled ? (
        <form
          method="get"
          className="flex flex-wrap items-end gap-x-2 gap-y-2 rounded-xl border border-slate-700 bg-slate-900/40 p-3 sm:gap-x-3 sm:p-4"
        >
          <div className="min-w-0 flex-1 basis-[12rem]">
            <label className="mb-1 block text-xs text-slate-400">{familyLabel}</label>
            <select
              name="family"
              defaultValue={familyFilter}
              className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-normal text-slate-100"
            >
              <option value="">{anyFamilyLabel}</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex shrink-0 items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-normal text-slate-100 hover:bg-slate-600"
            >
              {c.apply}
            </button>
            {familyFilter ? (
              <PrivateClinicFilterResetButton href="/dashboard/private-clinic/upcoming-visits" label={c.filterReset} />
            ) : null}
          </div>
        </form>
      ) : null}

      {allActiveClients.length === 0 ? (
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
                        className="sticky start-0 z-20 bg-slate-900/95 px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400 shadow-[8px_0_12px_-12px_rgb(15_23_42)]"
                      >
                        {uv.colClient}
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {uv.colNextDue}
                      </th>
                      {showScheduledColumn ? (
                        <th
                          scope="col"
                          className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                          {uv.colScheduled}
                        </th>
                      ) : null}
                      {showOverdueColumn ? (
                        <th
                          scope="col"
                          className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                          {uv.colOverdue}
                        </th>
                      ) : null}
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
                        {uv.colKupatHolim}
                      </th>
                      {settings?.family_therapy_enabled ? (
                        <th
                          scope="col"
                          className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                        >
                          Family
                        </th>
                      ) : null}
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
                        <td
                          className={`sticky start-0 z-10 whitespace-nowrap px-3 py-2 text-slate-200 shadow-[8px_0_12px_-12px_rgb(15_23_42)] ${
                            r.isOverdue
                              ? "bg-rose-950"
                              : r.isDueToday
                                ? "bg-amber-950"
                                : "bg-slate-900"
                          }`}
                        >
                          {obfuscate ? (
                            OBFUSCATED
                          ) : (
                            <Link
                              href={`/dashboard/private-clinic/clients/${encodeURIComponent(r.clientId)}/edit?fromUpcoming=1&modal=1`}
                              className="font-medium text-sky-400 hover:text-sky-300"
                            >
                              {r.name}
                            </Link>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="font-medium text-slate-100">
                            {formatHouseholdDate(r.nextDue, dateDisplayFormat)}
                          </span>
                          {r.isDueToday ? (
                            <span className="ms-2 rounded bg-amber-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-950">
                              {uv.dueToday}
                            </span>
                          ) : null}
                        </td>
                        {showScheduledColumn ? (
                          <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                            {r.nextAppointment ? (
                              formatHouseholdDateUtcWithTime(
                                r.nextAppointment.startAt,
                                dateDisplayFormat,
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                        {showOverdueColumn ? (
                          <td className="whitespace-nowrap px-3 py-2">
                            {r.isOverdue ? (
                              <span className="rounded bg-rose-600/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                {uv.overdue}
                              </span>
                            ) : null}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                          {formatHouseholdDate(r.lastVisit, dateDisplayFormat)}
                        </td>
                        <td className="max-w-[14rem] truncate px-3 py-2 text-slate-300" title={r.jobLabel}>
                          {r.jobLabel}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={r.programLabel}>
                          {r.programLabel}
                        </td>
                        <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={r.kupatHolimLabel}>
                          {r.kupatHolimLabel}
                        </td>
                        {settings?.family_therapy_enabled ? (
                          <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={allActiveClients.find((cRow) => cRow.id === r.clientId)?.family?.name ?? "—"}>
                            {allActiveClients.find((cRow) => cRow.id === r.clientId)?.family?.name ?? "—"}
                          </td>
                        ) : null}
                        <td className="whitespace-nowrap px-3 py-2">
                          <LogTreatmentLink
                            href={treatmentLogHref(r.clientId, r.nextAppointment?.id)}
                            label={uv.logTreatment}
                            clientId={r.clientId}
                            appointmentId={r.nextAppointment?.id}
                          />
                          {" · "}
                          <UpcomingVisitAppointmentActions
                            nextAppointment={r.nextAppointment}
                            scheduleAppointmentHref={scheduleAppointmentHref(
                              r.clientId,
                              r.nextDue,
                              r.isOverdue,
                            )}
                            scheduleAppointmentLabel={uv.scheduleAppointment}
                            rescheduleLabel={ap.reschedule}
                            cancelLabel={ap.cancel}
                          />
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
                  const nextAppointment = nextAppointmentByClientId.get(row.id) ?? null;
                  return (
                    <li key={row.id}>
                      <span>{obfuscate ? OBFUSCATED : name}</span>
                      {" — "}
                      <Link
                        href={treatmentLogHref(row.id, nextAppointment?.id)}
                        className="text-sky-400 hover:text-sky-300"
                      >
                        {uv.logTreatment}
                      </Link>
                      {" · "}
                      <UpcomingVisitAppointmentActions
                        nextAppointment={nextAppointment}
                        scheduleAppointmentHref={scheduleAppointmentHref(row.id, today, false)}
                        scheduleAppointmentLabel={uv.scheduleAppointment}
                        rescheduleLabel={ap.reschedule}
                        cancelLabel={ap.cancel}
                      />
                      {" · "}
                      <Link
                        href={`/dashboard/private-clinic/clients/${row.id}/edit?fromUpcoming=1&modal=1`}
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
