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

export const dynamic = "force-dynamic";

const CLIENTS_BASE = "/dashboard/private-clinic/clients";

type SortKey =
  | "created"
  | "first_name"
  | "last_name"
  | "start_date"
  | "end_date"
  | "job"
  | "program"
  | "active";

function parseSortKey(s: string | undefined): SortKey {
  const allowed: SortKey[] = [
    "created",
    "first_name",
    "last_name",
    "start_date",
    "end_date",
    "job",
    "program",
    "active",
  ];
  return allowed.includes(s as SortKey) ? (s as SortKey) : "created";
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
    case "program":
      return [{ default_program: { name: dir } }, { id: dir }];
    case "active":
      return [{ is_active: dir }, { id: dir }];
    case "created":
    default:
      return [{ created_at: dir }, { id: dir }];
  }
}

function clientsListHref(p: {
  q?: string;
  status?: string;
  sort: SortKey;
  dir: Prisma.SortOrder;
}) {
  const sp = new URLSearchParams();
  if (p.q?.trim()) sp.set("q", p.q.trim());
  if (p.status && p.status !== "all") sp.set("status", p.status);
  sp.set("sort", p.sort);
  sp.set("dir", p.dir);
  return `${CLIENTS_BASE}?${sp.toString()}`;
}

function SortHeader({
  column,
  label,
  sort,
  dir,
  q,
  status,
  sortHintAsc,
  sortHintDesc,
}: {
  column: SortKey;
  label: string;
  sort: SortKey;
  dir: Prisma.SortOrder;
  q: string;
  status: string;
  sortHintAsc: string;
  sortHintDesc: string;
}) {
  const nextDir: Prisma.SortOrder = sort === column ? (dir === "asc" ? "desc" : "asc") : "asc";
  const href = clientsListHref({ q, status, sort: column, dir: nextDir });
  const active = sort === column;
  return (
    <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
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
    sort?: string;
    dir?: string;
  }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const cl = privateClinicClients(uiLanguage);

  const resolved = searchParams ? await searchParams : undefined;
  const q = (resolved?.q ?? "").trim();
  const status = resolved?.status === "active" || resolved?.status === "inactive" ? resolved.status : "all";
  const sort = parseSortKey(resolved?.sort);
  const dirRaw = resolved?.dir;
  const dir: Prisma.SortOrder =
    dirRaw === "asc" || dirRaw === "desc"
      ? dirRaw
      : sort === "created"
        ? "desc"
        : "asc";

  const where: Prisma.therapy_clientsWhereInput = {
    household_id: householdId,
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
  };

  const clients = await prisma.therapy_clients.findMany({
    where,
    orderBy: orderByForSort(sort, dir),
    include: {
      default_job: true,
      default_program: true,
    },
  });

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
          {c.add} — {cl.addClientTitle}
        </Link>
      </div>

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
        <h2 className="text-sm font-medium text-slate-300">{cl.filters}</h2>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />
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
          <button
            type="submit"
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800/80"
          >
            {c.apply}
          </button>
          {(q || status !== "all") && (
            <Link
              href={clientsListHref({ sort, dir })}
              className="text-sm text-sky-400 hover:text-sky-300"
            >
              {c.cancel}
            </Link>
          )}
        </form>
      </section>

      {clients.length === 0 ? (
        <p className="text-sm text-slate-500">
          {q || status !== "all" ? c.noRowsMatch : c.clientsEmpty}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-900/80">
              <tr>
                <SortHeader
                  column="created"
                  label={cl.colRecorded}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="first_name"
                  label={cl.colClientName}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="last_name"
                  label={cl.colLastName}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="job"
                  label={cl.colJob}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="program"
                  label={cl.colProgram}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="start_date"
                  label={cl.colStart}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="end_date"
                  label={cl.colEnd}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <SortHeader
                  column="active"
                  label={cl.colActive}
                  sort={sort}
                  dir={dir}
                  q={q}
                  status={status}
                  sortHintAsc={cl.sortHintAsc}
                  sortHintDesc={cl.sortHintDesc}
                />
                <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {cl.colActions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {clients.map((row) => {
                const jobLabel = `${row.default_job.job_title}${row.default_job.employer_name ? ` - ${row.default_job.employer_name}` : ""}`;
                const programLabel = row.default_program?.name ?? c.none;
                const startDisp = row.start_date
                  ? formatHouseholdDate(row.start_date, dateDisplayFormat)
                  : c.noDate;
                const endDisp = row.end_date ? formatHouseholdDate(row.end_date, dateDisplayFormat) : c.noDate;
                return (
                  <tr key={row.id} className="hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                      {formatHouseholdDate(row.created_at, dateDisplayFormat)}
                    </td>
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
