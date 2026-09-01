import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { redirect } from "next/navigation";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { privateClinicDashboard } from "@/lib/private-clinic-i18n";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import {
  loadClinicDashboardData,
  parseDashboardProgramsFilter,
  resolveDashboardDateRange,
  formatDashboardMonthLabel,
} from "@/lib/private-clinic/clinic-dashboard-data";
import { formatAmountTotalsByCurrencyForDisplay } from "@/lib/private-clinic/list-amount-totals";
import { formatClientNameForDisplay, formatMoneyLineForDisplay, OBFUSCATED } from "@/lib/privacy-display";
import { DashboardFiltersForm } from "./dashboard-filters-form";
import {
  ClinicClientServiceChart,
  ClinicCountBarChart,
  ClinicHorizontalBarChart,
  ClinicStackedBarChart,
} from "./dashboard-charts";

export const dynamic = "force-dynamic";

const DASHBOARD_BASE = "/dashboard/private-clinic/dashboard";

type Search = {
  job?: string;
  program?: string | string[];
  from?: string;
  to?: string;
};

export default async function PrivateClinicDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const d = privateClinicDashboard(uiLanguage);
  const sp = searchParams ? await searchParams : {};

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const [jobs, programs] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, ...jobScope },
      select: { id: true, job_title: true, employer_name: true },
      orderBy: [{ start_date: "desc" }],
    }),
    prisma.therapy_service_programs.findMany({
      where: { household_id: householdId, job: jobScope },
      select: { id: true, name: true, job_id: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const jobOptions = jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }));
  const programOptions = programs.map((p) => ({ id: p.id, jobId: p.job_id, label: p.name }));
  const allowedJobIds = new Set(jobs.map((j) => j.id));
  const allowedProgramIds = new Set(programs.map((p) => p.id));

  const jobExplicit = sp.job === undefined ? undefined : sp.job;
  const jobIdRaw = defaultClinicJobId(jobOptions, jobExplicit);
  const jobId = jobIdRaw && allowedJobIds.has(jobIdRaw) ? jobIdRaw : "";

  const requestedPrograms = parseDashboardProgramsFilter(sp.program);
  const programsForJob = jobId ? programs.filter((p) => p.job_id === jobId) : programs;
  const validProgramIds = new Set(programsForJob.map((p) => p.id));
  const programIds = requestedPrograms.filter((id) => allowedProgramIds.has(id) && validProgramIds.has(id));

  const { fromYmd, toYmd, rangeStart, rangeEndExclusive } = resolveDashboardDateRange(
    sp.from?.trim() ?? "",
    sp.to?.trim() ?? "",
  );

  const data = await loadClinicDashboardData({
    householdId,
    familyMemberId,
    jobId,
    programIds,
    rangeStart,
    rangeEndExclusive,
    fromYmd,
    toYmd,
    noProgramLabel: d.noProgram,
    uiLanguage,
  });

  const totalIncomeDisplay = formatAmountTotalsByCurrencyForDisplay(
    obfuscate,
    data.totalsByCurrency,
    uiLanguage,
  );

  const formatChartMoney = (n: number) => {
    if (obfuscate) return OBFUSCATED;
    if (!data.chartCurrency) return n.toFixed(0);
    return formatMoneyLineForDisplay(false, n.toFixed(n % 1 === 0 ? 0 : 2), data.chartCurrency, uiLanguage);
  };
  const formatChartTick = (n: number) => {
    if (obfuscate) return "";
    if (n === 0) return "0";
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(Math.round(n));
  };

  const latestMonthLabel = data.latestMonthKey
    ? formatDashboardMonthLabel(data.latestMonthKey, uiLanguage)
    : "";

  const showJobBreakdown = !jobId && data.byJob.length > 1;
  const stackCaption = data.stackBy === "job" ? d.stackedByJob : d.stackedByProgram;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/private-clinic" className="text-sm text-slate-400 hover:text-slate-200">
          {d.backToClinic}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{d.title}</h2>
        <p className="text-sm text-slate-400">{d.intro}</p>
      </div>

      <DashboardFiltersForm
        action={DASHBOARD_BASE}
        job={jobId}
        programs={programIds}
        from={data.fromYmd}
        to={data.toYmd}
        jobs={jobOptions}
        programOptions={programOptions}
        filterResetHref={DASHBOARD_BASE}
        filterResetLabel={d.filterReset}
        labels={{
          filters: d.filters,
          job: d.job,
          program: d.program,
          from: d.from,
          to: d.to,
          apply: d.apply,
          any: d.any,
          anyF: d.anyF,
          selectedCountTemplate: d.selectedCountTemplate,
          selectAll: d.selectAll,
          deselectAll: d.deselectAll,
          filterDone: d.filterDone,
          filterCloseHint: d.filterCloseHint,
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <p className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "" : "uppercase"}`}>
            {d.totalIncome}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{totalIncomeDisplay}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <p className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "" : "uppercase"}`}>
            {d.payableLines}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{data.lineCount}</p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <p className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "" : "uppercase"}`}>
            {d.activeClients}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-100">{data.latestMonthActiveClients}</p>
          {latestMonthLabel ? (
            <p className="mt-1 text-xs text-slate-400">{d.clientsInMonth(latestMonthLabel)}</p>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">{d.incomeByMonth}</h3>
        {data.otherCurrenciesOmitted && data.chartCurrency ? (
          <p className="mt-1 text-xs text-slate-500">{d.chartCurrencyNote(data.chartCurrency)}</p>
        ) : null}
        <div className="mt-3">
          <ClinicStackedBarChart
            series={data.stackSeries}
            points={data.incomeByMonth}
            formatValue={formatChartMoney}
            formatTick={formatChartTick}
            emptyLabel={d.noData}
            caption={data.stackSeries.length > 1 ? stackCaption : undefined}
          />
        </div>
      </section>

      <div className={`grid gap-4 ${showJobBreakdown ? "lg:grid-cols-2" : ""}`}>
        {showJobBreakdown ? (
          <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
            <h3 className="mb-3 text-sm font-medium text-slate-200">{d.breakdownByJob}</h3>
            <ClinicHorizontalBarChart
              rows={data.byJob}
              formatValue={formatChartMoney}
              emptyLabel={d.noData}
            />
          </section>
        ) : null}
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
          <h3 className="mb-3 text-sm font-medium text-slate-200">{d.breakdownByProgram}</h3>
          <ClinicHorizontalBarChart
            rows={data.byProgram}
            formatValue={formatChartMoney}
            emptyLabel={d.noData}
          />
        </section>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">{d.activeClientsByMonth}</h3>
        <div className="mt-3">
          <ClinicCountBarChart points={data.activeClientsByMonth} emptyLabel={d.noData} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">{d.visitsByMonth}</h3>
        <div className="mt-3">
          <ClinicStackedBarChart
            series={data.visitTypeSeries}
            points={data.visitsByMonth}
            formatValue={(n) => String(n)}
            formatTick={(n) => (n === 0 ? "0" : String(Math.round(n)))}
            emptyLabel={d.noData}
            caption={data.visitTypeSeries.length > 1 ? d.stackedByVisitType : undefined}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <h3 className="text-sm font-medium text-slate-200">{d.visitsAndDaysPerClient}</h3>
        <p className="mt-1 text-xs text-slate-500">{d.perClientHint}</p>
        <div className="mt-3">
          <ClinicClientServiceChart
            rows={data.perClient.map((row) => ({
              id: row.id,
              name: formatClientNameForDisplay(obfuscate, row.firstName, row.lastName),
              visits: row.visits,
              daysInService: row.daysInService,
            }))}
            visitsLabel={d.visits}
            daysLabel={d.daysInService}
            emptyLabel={d.noData}
          />
        </div>
      </section>
    </div>
  );
}
