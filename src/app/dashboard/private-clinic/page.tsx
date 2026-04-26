import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import {
  privateClinicOverviewCardLabel,
  privateClinicOverviewStrings,
  privateClinicNavLabel,
} from "@/lib/private-clinic-i18n";
import {
  jobWherePrivateClinicScoped,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PRIVATE_CLINIC_NAV_ITEMS } from "@/lib/private-clinic-nav";
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

  const [clients, treatments, receipts, expenses, appointments, consultations, travel, upcomingVisitsData] =
    await Promise.all([
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
      prisma.therapy_appointments.count({
        where: {
          household_id: householdId,
          job: jobScope,
          status: "scheduled",
          start_at: { gte: new Date() },
        },
      }),
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
          if (!lastVisitAt) continue;
          const nextDue = nextVisitDueDateAfterLastTreatment(
            lastVisitAt,
            row.visits_per_period_count ?? 1,
            row.visits_per_period_weeks ?? 1,
          );
          total += 1;
          if (dateOnlyLocal(nextDue).getTime() < today.getTime()) {
            overdue += 1;
          }
        }
        return { total, overdue };
      })(),
    ]);

  const cards = [
    { id: "activeClients" as const, value: clients },
    { id: "treatments" as const, value: treatments },
    { id: "receipts" as const, value: receipts },
    { id: "expenses" as const, value: expenses },
    { id: "appointments" as const, value: appointments },
    {
      id: "upcomingVisits" as const,
      value: upcomingVisitsData.total,
      subValue: overviewCopy.overdueCount(upcomingVisitsData.overdue),
    },
    { id: "consultations" as const, value: consultations },
    { id: "travel" as const, value: travel },
  ];

  const quickLinkKeys = [
    "clients",
    "appointments",
    "upcomingVisits",
    "treatments",
    "receipts",
    "expenses",
    "reminders",
  ] as const;
  const quickLinks = quickLinkKeys
    .map((key) => PRIVATE_CLINIC_NAV_ITEMS.find((item) => item.key === key))
    .filter((item): item is (typeof PRIVATE_CLINIC_NAV_ITEMS)[number] => Boolean(item));

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <div
          key={c.id}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 ring-1 ring-slate-800"
        >
          <p
            className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "normal-case" : "uppercase"}`}
          >
            {privateClinicOverviewCardLabel(c.id, uiLanguage)}
          </p>
          <p className="text-2xl font-semibold text-slate-100">{c.value}</p>
          {"subValue" in c ? (
            <p className="mt-1 text-xs text-slate-400">{c.subValue}</p>
          ) : null}
        </div>
      ))}
      </div>
      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-medium text-slate-300">{overviewCopy.quickLinksTitle}</h2>
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              {privateClinicNavLabel(item.key, uiLanguage)}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
