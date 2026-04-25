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
import { privateClinicClients, privateClinicCommon } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { loadTherapyClientFormOptions } from "./load-therapy-client-form-options";
import { therapyClientsWhereLinkedPrivateClinicJobs } from "@/lib/private-clinic/jobs-scope";
import { nextVisitDueDateAfterLastTreatment } from "@/lib/therapy/visit-frequency";

type ListFilterQs = {
  q: string;
  status: string;
  job: string;
  family: string;
  from: string;
  to: string;
};

/** Parse yyyy-mm-dd to UTC midnight for stable @db.Date comparisons. */
function parseFilterYmd(s: string | undefined): Date | null {
  if (!s?.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da) return null;
  return d;
}

export const dynamic = "force-dynamic";

const CLIENTS_BASE = "/dashboard/private-clinic/clients";

type SortKey =
  | "first_name"
  | "last_name"
  | "start_date"
  | "end_date"
  | "job"
  | "family"
  | "program"
  | "active";

function parseSortKey(s: string | undefined): SortKey {
  const allowed: SortKey[] = [
    "first_name",
    "last_name",
    "start_date",
    "end_date",
    "job",
    "family",
    "program",
    "active",
  ];
  return allowed.includes(s as SortKey) ? (s as SortKey) : "first_name";
}

function orderByForSort(sort: SortKey, dir: Prisma.SortOrder): Prisma.therapy_clientsOrderByWithRelationInput[] {
  switch (sort) {
    case "first_name":
      return [{ first_name: dir }, { last_name: dir }, { id: dir }];
    case "last_name":
      return [{ last_name: dir }, { first_name: dir }, { id: dir }];
    case "start_date":
      return [{ start_date: dir }, { id: dir }];
    case "end_date":
      return [{ end_date: dir }, { id: dir }];
    case "job":
      return [{ default_job: { job_title: dir } }, { id: dir }];
    case "family":
      return [{ family: { name: dir } }, { id: dir }];
    case "program":
      return [{ default_program: { name: dir } }, { id: dir }];
    case "active":
      return [{ is_active: dir }, { id: dir }];
    default:
      return [{ first_name: dir }, { last_name: dir }, { id: dir }];
  }
}

function clientsListHref(p: {
  q?: string;
  status?: string;
  job?: string;
  family?: string;
  from?: string;
  to?: string;
  sort: SortKey;
  dir: Prisma.SortOrder;
}) {
  const sp = new URLSearchParams();
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.status && p.status !== "active") sp.set("status", p.status);
  if (p.job?.trim()) sp.set("job", p.job.trim());
  if (p.family?.trim()) sp.set("family", p.family.trim());
  if (p.from?.trim()) sp.set("from", p.from.trim());
  if (p.to?.trim()) sp.set("to", p.to.trim());
  sp.set("sort", p.sort);
  sp.set("dir", p.dir);
  return `${CLIENTS_BASE}?${sp.toString()}`;
}

function SortHeader({
  column,
  label,
  sort,
  dir,
  filters,
  sortHintAsc,
  sortHintDesc,
}: {
  column: SortKey;
  label: string;
  sort: SortKey;
  dir: Prisma.SortOrder;
  filters: ListFilterQs;
  sortHintAsc: string;
  sortHintDesc: string;
}) {
  const nextDir: Prisma.SortOrder = sort === column ? (dir === "asc" ? "desc" : "asc") : "asc";
  const href = clientsListHref({ ...filters, sort: column, dir: nextDir });
  const active = sort === column;
  return (
    <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
        title={active ? (dir === "asc" ? sortHintDesc : sortHintAsc) : sortHintAsc}
      >
        <span>{label}</span>
        {active ? <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span> : null}
      </Link>
    </th>
  );
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    q?: string;
    status?: string;
    job?: string;
    family?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const cl = privateClinicClients(uiLanguage);

  const resolved = searchParams ? await searchParams : undefined;
  const q = (resolved?.q ?? "").trim();
  const status = resolved?.status === "all" || resolved?.status === "inactive" ? resolved.status : "active";
  const fromRaw = (resolved?.from ?? "").trim();
  const toRaw = (resolved?.to ?? "").trim();
  const sort = parseSortKey(resolved?.sort);
  const dirRaw = resolved?.dir;
  const dir: Prisma.SortOrder =
    dirRaw === "asc" || dirRaw === "desc"
      ? dirRaw
      : "asc";

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const { jobs } = await loadTherapyClientFormOptions({ householdId, familyMemberId });
  const settings = await prisma.therapy_settings.findUnique({
    where: { household_id: householdId },
    select: { family_therapy_enabled: true },
  });
  const familyTherapyEnabled = Boolean(settings?.family_therapy_enabled);
  const families = familyTherapyEnabled
    ? await prisma.therapy_families.findMany({
        where: { household_id: householdId },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }],
      })
    : [];
  const allowedJobIds = new Set(jobs.map((j) => j.id));
  const jobIdRaw = (resolved?.job ?? "").trim();
  const jobId = allowedJobIds.has(jobIdRaw) ? jobIdRaw : "";
  const familyIdRaw = (resolved?.family ?? "").trim();
  const allowedFamilyIds = new Set(families.map((f) => f.id));
  const familyId = allowedFamilyIds.has(familyIdRaw) ? familyIdRaw : "";

  let dateFrom = parseFilterYmd(fromRaw);
  let dateTo = parseFilterYmd(toRaw);
  if (dateFrom && dateTo && dateFrom > dateTo) {
    const t = dateFrom;
    dateFrom = dateTo;
    dateTo = t;
  }
  const dateRangeActive = Boolean(dateFrom && dateTo);

  const listFilters: ListFilterQs = {
    q,
    status,
    job: jobId,
    family: familyId,
    from: fromRaw,
    to: toRaw,
  };

  const where: Prisma.therapy_clientsWhereInput = {
    household_id: householdId,
    ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
    ...(status === "active" ? { is_active: true } : status === "inactive" ? { is_active: false } : {}),
    ...(q
      ? {
          OR: [
            { first_name: { contains: q, mode: "insensitive" as const } },
            { last_name: { contains: q, mode: "insensitive" as const } },
            ...(obfuscate ? [] : [{ id_number: { contains: q, mode: "insensitive" as const } }]),
          ],
        }
      : {}),
    ...(jobId
      ? {
          OR: [{ default_job_id: jobId }, { client_jobs: { some: { job_id: jobId } } }],
        }
      : {}),
    ...(familyId ? { family_id: familyId } : {}),
    ...(dateRangeActive && dateFrom && dateTo
      ? {
          AND: [
            { OR: [{ start_date: null }, { start_date: { lte: dateTo } }] },
            { OR: [{ end_date: null }, { end_date: { gte: dateFrom } }] },
          ],
        }
      : {}),
  };

  const [baseClientCount, clients] = await Promise.all([
    prisma.therapy_clients.count({
      where: { household_id: householdId, ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId) },
    }),
    prisma.therapy_clients.findMany({
      where,
      orderBy: orderByForSort(sort, dir),
      include: {
        default_job: true,
        default_program: true,
        family: true,
      },
    }),
  ]);
  const treatmentCountsRaw =
    clients.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: {
            household_id: householdId,
            client_id: { in: clients.map((c) => c.id) },
          },
          _count: { _all: true },
        })
      : [];
  const treatmentCountByClientId = new Map<string, number>(
    treatmentCountsRaw.map((row) => [row.client_id, row._count._all]),
  );

  const lastTreatmentByClientId =
    clients.length > 0
      ? await prisma.therapy_treatments.groupBy({
          by: ["client_id"],
          where: {
            household_id: householdId,
            client_id: { in: clients.map((c) => c.id) },
          },
          _max: { occurred_at: true },
        })
      : [];
  const lastVisitAtByClientId = new Map(
    lastTreatmentByClientId.map((row) => [row.client_id, row._max.occurred_at]),
  );

  const hasActiveFilters =
    Boolean(q) || status !== "active" || Boolean(jobId) || Boolean(familyId) || Boolean(fromRaw) || Boolean(toRaw);

  return (
    <div className="space-y-6">
      {resolved?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {resolved.error}
        </p>
      )}
      {(resolved?.created || resolved?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-lg font-medium text-slate-200">{cl.clientsHeading}</h1>
        <Link
          href={`${CLIENTS_BASE}/new`}
          className="inline-flex shrink-0 items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {cl.addClientBtn}
        </Link>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="text-sm font-medium text-slate-300">{cl.filters}</h2>
        <form method="get" className="space-y-3">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[12rem] flex-1 space-y-1">
              <label htmlFor="clients_filter_q" className="block text-xs text-slate-400">
                {cl.filterSearchLabel}
              </label>
              <input
                id="clients_filter_q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={cl.filterSearchPlaceholder}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="min-w-[12rem] space-y-1">
              <label htmlFor="clients_filter_job" className="block text-xs text-slate-400">
                {cl.filterJobLabel}
              </label>
              <select
                id="clients_filter_job"
                name="job"
                defaultValue={jobId}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{cl.filterJobAny}</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem] space-y-1">
              {familyTherapyEnabled ? (
                <>
                  <label htmlFor="clients_filter_family" className="block text-xs text-slate-400">
                    {cl.filterFamilyLabel}
                  </label>
                  <select
                    id="clients_filter_family"
                    name="family"
                    defaultValue={familyId}
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="">{cl.filterFamilyAny}</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
            </div>
            <div className="min-w-[10rem] space-y-1">
              <label htmlFor="clients_filter_status" className="block text-xs text-slate-400">
                {cl.filterStatusLabel}
              </label>
              <select
                id="clients_filter_status"
                name="status"
                defaultValue={status}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="all">{cl.filterStatusAll}</option>
                <option value="active">{cl.filterStatusActiveOnly}</option>
                <option value="inactive">{cl.filterStatusInactiveOnly}</option>
              </select>
            </div>
            <div className="min-w-[9rem] space-y-1">
              <label htmlFor="clients_filter_from" className="block text-xs text-slate-400">
                {c.from}
              </label>
              <input
                id="clients_filter_from"
                name="from"
                type="date"
                defaultValue={fromRaw}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="min-w-[9rem] space-y-1">
              <label htmlFor="clients_filter_to" className="block text-xs text-slate-400">
                {c.to}
              </label>
              <input
                id="clients_filter_to"
                name="to"
                type="date"
                defaultValue={toRaw}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800/80"
            >
              {c.apply}
            </button>
            {hasActiveFilters ? (
              <Link
                href={clientsListHref({ sort, dir })}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                {c.cancel}
              </Link>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">{cl.filterDateRangeHelp}</p>
        </form>
      </section>

      {clients.length === 0 ? (
        <p className="text-sm text-slate-500">{baseClientCount === 0 ? c.clientsEmpty : c.noRowsMatch}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-900/80">
              <tr>
                <SortHeader
                  column="first_name"
                  label={cl.colClientName}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="last_name"
                  label={cl.colLastName}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="job"
                  label={cl.colJob}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="program"
                  label={cl.colProgram}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                {familyTherapyEnabled ? (
                  <SortHeader
                    column="family"
                    label={cl.colFamily}
                    sort={sort}
                    dir={dir}
                    filters={listFilters}
                    sortHintAsc={cl.sortHintAsc}
                    sortHintDesc={cl.sortHintDesc}
                  />
                ) : null}
                <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cl.colTreatmentsCount}
                </th>
                <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cl.colNextVisitDue}
                </th>
                <SortHeader
                  column="start_date"
                  label={cl.colStart}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="end_date"
                  label={cl.colEnd}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="active"
                  label={c.status}
                  sort={sort}
                  dir={dir}
                  filters={listFilters}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cl.colActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {clients.map((row) => {
                const jobLabel = formatJobDisplayLabel(row.default_job);
                const programLabel = row.default_program?.name ?? c.none;
                const treatmentsCount = treatmentCountByClientId.get(row.id) ?? 0;
                const lastVisitAt = lastVisitAtByClientId.get(row.id);
                const vc = row.visits_per_period_count;
                const vw = row.visits_per_period_weeks;
                let nextVisitDisp: string;
                let nextVisitTitle: string | undefined;
                if (vc == null || vw == null) {
                  nextVisitDisp = "—";
                  nextVisitTitle = cl.nextVisitNoFrequency;
                } else if (!lastVisitAt) {
                  nextVisitDisp = "—";
                  nextVisitTitle = cl.nextVisitNoTreatments;
                } else {
                  const due = nextVisitDueDateAfterLastTreatment(lastVisitAt, vc, vw);
                  nextVisitDisp = formatHouseholdDate(due, dateDisplayFormat);
                  nextVisitTitle = undefined;
                }
                const startDisp = row.start_date
                  ? formatHouseholdDate(row.start_date, dateDisplayFormat)
                  : c.noDate;
                const endDisp = row.end_date ? formatHouseholdDate(row.end_date, dateDisplayFormat) : c.noDate;
                const treatmentsHref = `/dashboard/private-clinic/treatments?client=${encodeURIComponent(row.id)}`;
                return (
                  <tr key={row.id} className="hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                      {obfuscate ? OBFUSCATED : row.first_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                      {obfuscate ? OBFUSCATED : row.last_name ?? ""}
                    </td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-slate-300" title={jobLabel}>
                      {jobLabel}
                    </td>
                    <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={programLabel}>
                      {programLabel}
                    </td>
                    {familyTherapyEnabled ? (
                      <td className="max-w-[12rem] truncate px-3 py-2 text-slate-300" title={row.family?.name ?? "—"}>
                        {row.family?.name ?? "—"}
                      </td>
                    ) : null}
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                      <Link href={treatmentsHref} className="font-medium text-sky-400 hover:text-sky-300 hover:underline">
                        {treatmentsCount}
                      </Link>
                    </td>
                    <td
                      className="whitespace-nowrap px-3 py-2 text-slate-300"
                      title={nextVisitTitle}
                    >
                      {nextVisitDisp}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{startDisp}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{endDisp}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                      {row.is_active ? c.active : c.inactive}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link
                        href={`${CLIENTS_BASE}/${row.id}/edit`}
                        className="font-medium text-sky-400 hover:text-sky-300"
                      >
                        {c.edit}
                      </Link>
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
