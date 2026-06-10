import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import {
  privateClinicOverviewStatNavKey,
  privateClinicOverviewStrings,
} from "@/lib/private-clinic-i18n";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { getVisiblePrivateClinicNavItems } from "@/lib/private-clinic-nav";
import { redirect } from "next/navigation";
import Link from "next/link";
import PrivateClinicOverviewCardsClient from "./private-clinic-overview-cards-client";
import { getUpcomingAppointmentsForHousehold } from "@/lib/therapy/series-occurrences";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";
import { dateOnlyLocal, startOfTodayLocal } from "@/lib/private-clinic/reminders-logic";

export const dynamic = "force-dynamic";

export default async function PrivateClinicOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ passwordUpdated?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const passwordJustUpdated = resolvedSearchParams?.passwordUpdated === "1";

  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const uiLanguage = await getCurrentUiLanguage();
  const overviewCopy = privateClinicOverviewStrings(uiLanguage);

  const [
    jobsCount,
    clients,
    treatments,
    receipts,
    expenses,
    appointments,
    consultations,
    travel,
    upcomingVisitsData,
    therapySettings,
  ] = await Promise.all([
      prisma.jobs.count({
        where: {
          household_id: householdId,
          is_active: true,
          ...jobScope,
        },
      }),
      prisma.therapy_clients.count({
        where: {
          household_id: householdId,
          is_active: true,
          ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
        },
      }),
      prisma.therapy_treatments.count({
        where: { household_id: householdId, job: jobScope },
      }),
      prisma.therapy_receipts.count({
        where: { household_id: householdId, job: jobScope },
      }),
      prisma.therapy_job_expenses.count({
        where: { household_id: householdId, job: jobScope },
      }),
      (async () => {
        const rows = await getUpcomingAppointmentsForHousehold({
          householdId,
          jobWhere: jobScope,
        });
        const now = new Date();
        return rows.filter((r) => r.status === "scheduled" && r.startAt >= now).length;
      })(),
      prisma.therapy_consultations.count({
        where: { household_id: householdId, job: jobScope },
      }),
      prisma.therapy_travel_entries.count({
        where: {
          household_id: householdId,
          OR: [{ job: jobScope }, { treatment: { job: jobScope } }],
        },
      }),
      (async () => {
        const clientsWithFrequency = await prisma.therapy_clients.findMany({
          where: {
            household_id: householdId,
            is_active: true,
            visits_per_period_count: { not: null },
            visits_per_period_weeks: { not: null },
            ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
          },
          select: {
            id: true,
            start_date: true,
            visits_per_period_count: true,
            visits_per_period_weeks: true,
          },
        });

        const clientIds = clientsWithFrequency.map((row) => row.id);
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

        const lastVisitByClientId = new Map(
          lastTreatmentRows
            .filter((row) => row._max.occurred_at != null)
            .map((row) => [row.client_id, row._max.occurred_at as Date]),
        );

        const today = startOfTodayLocal();
        let total = 0;
        let overdue = 0;
        for (const row of clientsWithFrequency) {
          const lastVisitAt = lastVisitByClientId.get(row.id);
          const nextDue = lastVisitAt
            ? nextVisitDueDateAfterLastTreatment(
                lastVisitAt,
                row.visits_per_period_count ?? 1,
                row.visits_per_period_weeks ?? 1,
              )
            : row.start_date
              ? dateOnlyLocal(row.start_date)
              : null;
          if (!nextDue) continue;
          total += 1;
          if (dateOnlyLocal(nextDue).getTime() < today.getTime()) {
            overdue += 1;
          }
        }
        return { total, overdue };
      })(),
      prisma.therapy_settings.findUnique({
        where: { household_id: householdId },
        select: { nav_tabs_json: true, family_therapy_enabled: true },
      }),
    ]);

  let navItems = getVisiblePrivateClinicNavItems(therapySettings?.nav_tabs_json);
  if (!therapySettings?.family_therapy_enabled) {
    navItems = navItems.filter((item) => item.key !== "families");
  }
  const visibleNavKeys = new Set(navItems.map((item) => item.key));

  const cards = [
    { id: "activeClients" as const, href: "/dashboard/private-clinic/clients", value: clients },
    { id: "treatments" as const, href: "/dashboard/private-clinic/treatments", value: treatments },
    { id: "receipts" as const, href: "/dashboard/private-clinic/receipts", value: receipts },
    { id: "expenses" as const, href: "/dashboard/private-clinic/expenses", value: expenses },
    { id: "appointments" as const, href: "/dashboard/private-clinic/appointments", value: appointments },
    {
      id: "upcomingVisits" as const,
      href: "/dashboard/private-clinic/upcoming-visits",
      value: upcomingVisitsData.total,
      subValue: overviewCopy.overdueCount(upcomingVisitsData.overdue),
    },
    { id: "consultations" as const, href: "/dashboard/private-clinic/consultations", value: consultations },
    { id: "travel" as const, href: "/dashboard/private-clinic/travel", value: travel },
  ];

  const visibleCards = cards.filter((c) => visibleNavKeys.has(privateClinicOverviewStatNavKey(c.id)));

  const passwordBanner = passwordJustUpdated ? (
    <p
      className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200"
      role="status"
    >
      {uiLanguage === "he" ? "הסיסמה עודכנה בהצלחה." : "Your password was updated successfully."}
    </p>
  ) : null;

  return (
    <>
      {passwordBanner}
      {jobsCount === 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-amber-100">
          <h2 className="text-base font-semibold">{overviewCopy.noJobsTitle}</h2>
          <p className="mt-1 text-sm text-amber-100/90">{overviewCopy.noJobsDescription}</p>
          <div className="mt-3">
            <Link
              href="/dashboard/private-clinic/jobs"
              className="inline-flex items-center rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-100 hover:bg-amber-500/30"
            >
              {overviewCopy.goToJobs}
            </Link>
          </div>
        </div>
      ) : null}
      {jobsCount > 0 && visibleCards.length > 0 ? (
        <PrivateClinicOverviewCardsClient
          uiLanguage={uiLanguage}
          cards={visibleCards.map((c) => ({
            id: c.id,
            href: c.href,
            value: c.value,
            ...("subValue" in c ? { subValue: c.subValue } : {}),
          }))}
        />
      ) : null}
    </>
  );
}
