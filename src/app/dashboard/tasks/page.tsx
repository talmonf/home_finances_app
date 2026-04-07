import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTask } from "./actions";
import {
  formatHouseholdDate,
  type HouseholdDateDisplayFormat,
} from "@/lib/household-date-format";

export const dynamic = "force-dynamic";

const SORT_COLUMNS = [
  "subject",
  "type",
  "status",
  "priority",
  "schedule_date",
  "due_date",
  "assignee",
  "links",
  "created",
] as const;

type SortColumn = (typeof SORT_COLUMNS)[number];

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    status?: string;
    sort?: string;
    dir?: string;
  }>;
};

function formatDate(d: Date, dateDisplayFormat: HouseholdDateDisplayFormat) {
  return formatHouseholdDate(new Date(d), dateDisplayFormat);
}

function formatDateInput(
  d: Date | null,
  dateDisplayFormat: HouseholdDateDisplayFormat,
) {
  if (!d) return "—";
  return formatHouseholdDate(new Date(d), dateDisplayFormat);
}

function assigneeLabel(task: {
  family_member: { full_name: string } | null;
  assigned_user: { full_name: string } | null;
}) {
  if (task.family_member) return task.family_member.full_name;
  if (task.assigned_user) return `${task.assigned_user.full_name} (Advisor)`;
  return "—";
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

function linksSortKey(task: {
  link_1_title: string | null;
  link_2_title: string | null;
}) {
  const a = (task.link_1_title ?? "").trim();
  const b = (task.link_2_title ?? "").trim();
  return a || b || "";
}

function compareTasks(
  a: {
    subject: string;
    type: string;
    status: string;
    priority: string;
    schedule_date: Date | null;
    due_date: Date | null;
    created_at: Date;
    family_member: { full_name: string } | null;
    assigned_user: { full_name: string } | null;
    link_1_title: string | null;
    link_2_title: string | null;
  },
  b: typeof a,
  sortKey: SortColumn,
  dir: "asc" | "desc",
) {
  const mult = dir === "desc" ? -1 : 1;
  const nullsLast = (x: Date | null) => (x ? x.getTime() : Number.POSITIVE_INFINITY);

  switch (sortKey) {
    case "subject":
      return mult * a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" });
    case "type":
      return mult * a.type.localeCompare(b.type);
    case "status":
      return mult * a.status.localeCompare(b.status);
    case "priority": {
      const ra = PRIORITY_RANK[a.priority] ?? 99;
      const rb = PRIORITY_RANK[b.priority] ?? 99;
      return mult * (ra - rb);
    }
    case "schedule_date": {
      const na = nullsLast(a.schedule_date);
      const nb = nullsLast(b.schedule_date);
      if (na !== nb) return mult * (na - nb);
      return a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" });
    }
    case "due_date": {
      const na = nullsLast(a.due_date);
      const nb = nullsLast(b.due_date);
      if (na !== nb) return mult * (na - nb);
      return a.subject.localeCompare(b.subject, undefined, { sensitivity: "base" });
    }
    case "assignee":
      return mult * assigneeLabel(a).localeCompare(assigneeLabel(b), undefined, { sensitivity: "base" });
    case "links":
      return mult * linksSortKey(a).localeCompare(linksSortKey(b), undefined, { sensitivity: "base" });
    case "created":
      return mult * (a.created_at.getTime() - b.created_at.getTime());
    default:
      return 0;
  }
}

function buildTasksQueryString(params: {
  status?: string | null;
  sort?: string | null;
  dir?: "asc" | "desc" | null;
  created?: string | null;
  updated?: string | null;
  error?: string | null;
}) {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.sort) sp.set("sort", params.sort);
  if (params.dir && params.sort) sp.set("dir", params.dir);
  if (params.created) sp.set("created", params.created);
  if (params.updated) sp.set("updated", params.updated);
  if (params.error) sp.set("error", params.error);
  const q = sp.toString();
  return q ? `?${q}` : "";
}

function nextSortHref(
  column: SortColumn,
  currentSort: SortColumn | undefined,
  currentDir: "asc" | "desc",
  base: { status?: string | null; created?: string | null; updated?: string | null; error?: string | null },
) {
  const nextDir = currentSort === column && currentDir === "asc" ? "desc" : "asc";
  return `/dashboard/tasks${buildTasksQueryString({
    ...base,
    sort: column,
    dir: nextDir,
  })}`;
}

export default async function TasksPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const statusFilter = resolvedSearchParams?.status?.trim() || null;

  const rawSort = resolvedSearchParams?.sort?.trim();
  const sortKey = SORT_COLUMNS.includes(rawSort as SortColumn) ? (rawSort as SortColumn) : undefined;
  const sortDir: "asc" | "desc" = resolvedSearchParams?.dir === "desc" ? "desc" : "asc";

  const taskStatus = statusFilter && ["open", "in_work", "on_hold", "closed"].includes(statusFilter)
    ? (statusFilter as "open" | "in_work" | "on_hold" | "closed")
    : undefined;

  const [tasksRaw, familyMembers, advisors] = await Promise.all([
    prisma.tasks.findMany({
      where: {
        household_id: householdId,
        ...(taskStatus ? { status: taskStatus } : {}),
      },
      include: { family_member: true, assigned_user: true },
      orderBy: sortKey ? { id: "asc" } : [{ priority: "asc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.users.findMany({
      where: { household_id: householdId, user_type: "financial_advisor", is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const tasks = sortKey
    ? [...tasksRaw].sort((a, b) => compareTasks(a, b, sortKey, sortDir))
    : tasksRaw;

  const queryBase = {
    status: statusFilter,
    created: resolvedSearchParams?.created ?? null,
    updated: resolvedSearchParams?.updated ?? null,
    error: resolvedSearchParams?.error ?? null,
  };

  const statusFilterHref = (value: string) =>
    `/dashboard/tasks${buildTasksQueryString({
      ...queryBase,
      status: value || null,
      sort: sortKey ?? null,
      dir: sortKey ? sortDir : null,
    })}`;

  const sortHeaderClass =
    "inline-flex items-center gap-1 rounded px-1 py-0.5 text-left font-medium text-slate-300 hover:bg-slate-700/80 hover:text-slate-100";

  const statusOptions = [
    { value: "", label: isHebrew ? "הכל" : "All" },
    { value: "open", label: isHebrew ? "פתוח" : "Open" },
    { value: "in_work", label: isHebrew ? "בטיפול" : "In Work" },
    { value: "on_hold", label: isHebrew ? "מושהה" : "On Hold" },
    { value: "closed", label: isHebrew ? "סגור" : "Closed" },
  ];

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "משימות" : "Tasks"}</h1>
          <p className="text-sm text-slate-400">
            Create and track tasks. Assign to a family member or a financial advisor. Automatic tasks will be added by the system later.
          </p>
          {(resolvedSearchParams?.created || resolvedSearchParams?.updated || resolvedSearchParams?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolvedSearchParams.error
                ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                : resolvedSearchParams.updated
                  ? "Task updated."
                  : "Task created."}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "משימה חדשה" : "New task"}</h2>
          <form
            action={createTask}
            className="grid gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="sm:col-span-2">
              <label htmlFor="subject" className="mb-1 block text-xs font-medium text-slate-400">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Task subject"
              />
            </div>
            <div>
              <label htmlFor="priority" className="mb-1 block text-xs font-medium text-slate-400">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="type" className="mb-1 block text-xs font-medium text-slate-400">
                Type
              </label>
              <select
                id="type"
                name="type"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="manual">Manual</option>
                <option value="automatic">Automatic</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="mb-1 block text-xs font-medium text-slate-400">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="schedule_date" className="mb-1 block text-xs font-medium text-slate-400">
                Schedule Date
              </label>
              <input
                id="schedule_date"
                name="schedule_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="due_date" className="mb-1 block text-xs font-medium text-slate-400">
                Due Date
              </label>
              <input
                id="due_date"
                name="due_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div>
              <label htmlFor="family_member_id_new" className="mb-1 block text-xs font-medium text-slate-400">
                Family member assignee
              </label>
              <select
                name="family_member_id"
                id="family_member_id_new"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label="Family member"
              >
                <option value="">Select family member</option>
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
              <label htmlFor="assigned_user_id_new" className="mb-1 mt-2 block text-xs font-medium text-slate-400">
                Advisor assignee
              </label>
              <select
                name="assigned_user_id"
                id="assigned_user_id_new"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                aria-label="Advisor"
              >
                <option value="">Select advisor</option>
                {advisors.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {isHebrew ? "הוספת משימה" : "Add task"}
              </button>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="link_1_title_new" className="mb-1 block text-xs font-medium text-slate-400">
                Link 1 title
              </label>
              <input
                id="link_1_title_new"
                name="link_1_title"
                className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Vendor portal"
              />
              <label htmlFor="link_1_url_new" className="mb-1 block text-xs font-medium text-slate-400">
                Link 1 URL
              </label>
              <input
                id="link_1_url_new"
                name="link_1_url"
                type="url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="link_2_title_new" className="mb-1 block text-xs font-medium text-slate-400">
                Link 2 title
              </label>
              <input
                id="link_2_title_new"
                name="link_2_title"
                className="mb-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="e.g. Reference doc"
              />
              <label htmlFor="link_2_url_new" className="mb-1 block text-xs font-medium text-slate-400">
                Link 2 URL
              </label>
              <input
                id="link_2_url_new"
                name="link_2_url"
                type="url"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                placeholder="https://..."
              />
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "משימות" : "Tasks"}</h2>
            <div className="flex gap-2">
              {statusOptions.map((opt) => (
                <Link
                  key={opt.value || "all"}
                  href={statusFilterHref(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                    (statusFilter ?? "") === opt.value
                      ? "bg-sky-600 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין משימות עדיין. ניתן ליצור למעלה." : "No tasks yet. Create one above."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3" aria-sort={sortKey === "subject" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("subject", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Subject
                        {sortKey === "subject" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "type" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("type", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Type
                        {sortKey === "type" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "status" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("status", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Status
                        {sortKey === "status" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "priority" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("priority", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Priority
                        {sortKey === "priority" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "schedule_date" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("schedule_date", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Schedule
                        {sortKey === "schedule_date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "due_date" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("due_date", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Due
                        {sortKey === "due_date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "assignee" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("assignee", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Assignee
                        {sortKey === "assignee" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "links" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("links", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Links
                        {sortKey === "links" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3" aria-sort={sortKey === "created" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}>
                      <Link href={nextSortHref("created", sortKey, sortDir, queryBase)} className={sortHeaderClass}>
                        Created
                        {sortKey === "created" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </Link>
                    </th>
                    <th className="px-4 py-3 font-medium text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-100">{task.subject}</span>
                        {task.description && (
                          <p className="mt-0.5 truncate max-w-[200px] text-xs text-slate-400" title={task.description}>
                            {task.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 capitalize">{task.type}</td>
                      <td className="px-4 py-3">
                        <span className="text-slate-300 capitalize">{task.status.replace("_", " ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            task.priority === "high"
                              ? "text-amber-400"
                              : task.priority === "low"
                                ? "text-slate-400"
                                : "text-slate-300"
                          }
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDateInput(task.schedule_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDateInput(task.due_date, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{assigneeLabel(task)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {task.link_1_title && task.link_1_url && (
                            <a
                              href={task.link_1_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 hover:underline"
                            >
                              {task.link_1_title}
                            </a>
                          )}
                          {task.link_2_title && task.link_2_url && (
                            <a
                              href={task.link_2_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:text-sky-300 hover:underline"
                            >
                              {task.link_2_title}
                            </a>
                          )}
                          {!task.link_1_title && !task.link_2_title && (
                            <span className="text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(task.created_at, dateDisplayFormat)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/tasks/${task.id}/edit`}
                          className="inline-flex rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
