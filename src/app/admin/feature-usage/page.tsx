import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, prisma } from "@/lib/auth";
import {
  fetchBridgedUsageEvents,
  fetchUsageMatrix,
} from "@/lib/usage-audit/bridge";
import {
  PRIVATE_CLINIC_FEATURE_KEYS,
  privateClinicFeatureLabel,
} from "@/lib/usage-audit/catalog";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 90;

type PageProps = {
  searchParams?: Promise<{
    householdId?: string;
    userId?: string;
    feature?: string;
    days?: string;
  }>;
};

function formatCellDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-CA");
}

export default async function FeatureUsageAdminPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) redirect("/");

  const resolved = searchParams ? await searchParams : undefined;
  const householdId = resolved?.householdId?.trim() || undefined;
  const userId = resolved?.userId?.trim() || undefined;
  const feature = resolved?.feature?.trim() || undefined;
  const days = Math.min(
    365,
    Math.max(1, Number(resolved?.days ?? DEFAULT_DAYS) || DEFAULT_DAYS),
  );
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [households, matrixRows, eventsResult] = await Promise.all([
    prisma.households.findMany({
      where: {
        is_active: true,
        household_enabled_sections: {
          some: { section_id: "privateClinic", enabled: true },
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    fetchUsageMatrix({ householdId, userId, since }),
    fetchBridgedUsageEvents({
      householdId,
      userId,
      feature,
      since,
      limit: 100,
      offset: 0,
    }),
  ]);

  const exportQs = new URLSearchParams();
  exportQs.set("days", String(days));
  if (householdId) exportQs.set("householdId", householdId);

  const filterBase = (extra?: Record<string, string>) => {
    const q = new URLSearchParams();
    q.set("days", String(days));
    if (householdId) q.set("householdId", householdId);
    if (userId) q.set("userId", userId);
    if (feature) q.set("feature", feature);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) q.set(k, v);
      }
    }
    return `/admin/feature-usage?${q.toString()}`;
  };

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-[96rem] space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">
            <Link href="/" className="text-sky-400 hover:underline">
              ← Back to Home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Feature usage (private clinic)</h1>
          <p className="text-sm text-slate-400">
            Which household users visit clinic sections and perform key actions. Includes bridged
            data from appointment and general audit logs.
          </p>
        </header>

        <form method="get" className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Household
            <select
              name="householdId"
              defaultValue={householdId ?? ""}
              className="min-w-[12rem] rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">All clinic households</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Days
            <input
              type="number"
              name="days"
              min={1}
              max={365}
              defaultValue={days}
              className="w-24 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Apply
          </button>
          <a
            href={`/api/admin/feature-usage/export?${exportQs.toString()}`}
            className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Export CSV
          </a>
          {(householdId || userId || feature) && (
            <Link href="/admin/feature-usage" className="text-sm text-sky-400 hover:underline">
              Clear filters
            </Link>
          )}
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-100">Usage matrix</h2>
          <p className="text-xs text-slate-400">
            Cells show total events (visits + actions) and last activity date. Click a column header
            to filter the event log.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 uppercase text-slate-400">
                  <th className="sticky left-0 z-10 bg-slate-900 py-2 pr-3 pl-2">User</th>
                  <th className="py-2 pr-3">Household</th>
                  {PRIVATE_CLINIC_FEATURE_KEYS.map((f) => (
                    <th key={f} className="py-2 pr-3 whitespace-nowrap">
                      <Link
                        href={filterBase({ feature: f })}
                        className="hover:text-sky-300"
                        title={`Filter events: ${privateClinicFeatureLabel(f)}`}
                      >
                        {privateClinicFeatureLabel(f)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + PRIVATE_CLINIC_FEATURE_KEYS.length} className="py-6 text-center text-slate-500">
                      No active users with private clinic enabled in this range.
                    </td>
                  </tr>
                ) : (
                  matrixRows.map((row) => (
                    <tr key={row.userId} className="border-b border-slate-800 align-top last:border-0">
                      <td className="sticky left-0 z-10 bg-slate-900 py-2 pr-3 pl-2">
                        <Link
                          href={filterBase({ userId: row.userId })}
                          className="font-medium text-sky-300 hover:underline"
                        >
                          {row.userName}
                        </Link>
                        <div className="text-slate-500">{row.userEmail}</div>
                      </td>
                      <td className="py-2 pr-3 text-slate-300">{row.householdName}</td>
                      {row.cells.map((cell) => (
                        <td
                          key={cell.feature}
                          className={`py-2 pr-3 whitespace-nowrap ${
                            cell.totalCount === 0 ? "text-slate-600" : "text-slate-200"
                          }`}
                          title={`Visits: ${cell.visitCount}, Actions: ${cell.actionCount}`}
                        >
                          {cell.totalCount > 0 ? (
                            <>
                              <span className="font-medium">{cell.totalCount}</span>
                              <span className="text-slate-500"> · {formatCellDate(cell.lastUsedAt)}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-100">Event log</h2>
          {(userId || feature) && (
            <p className="text-xs text-slate-400">
              Filtered
              {userId ? " by user" : ""}
              {feature ? ` · feature: ${privateClinicFeatureLabel(feature as (typeof PRIVATE_CLINIC_FEATURE_KEYS)[number])}` : ""}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <table className="min-w-full text-left text-xs text-slate-200">
              <thead>
                <tr className="border-b border-slate-700 uppercase text-slate-400">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2 pr-3">Feature</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Resource</th>
                  <th className="py-2 pr-3">User</th>
                </tr>
              </thead>
              <tbody>
                {eventsResult.events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500">
                      No events in range.
                    </td>
                  </tr>
                ) : (
                  eventsResult.events.map((e) => {
                    const userRow = matrixRows.find((r) => r.userId === e.userId);
                    return (
                      <tr key={`${e.source}-${e.id}`} className="border-b border-slate-800 align-top last:border-0">
                        <td className="py-2 pr-3 text-slate-300">
                          {e.createdAt.toLocaleString("en-CA")}
                        </td>
                        <td className="py-2 pr-3 text-slate-400">{e.source}</td>
                        <td className="py-2 pr-3">
                          <Link
                            href={filterBase({ feature: e.feature })}
                            className="text-sky-300 hover:underline"
                          >
                            {privateClinicFeatureLabel(e.feature as (typeof PRIVATE_CLINIC_FEATURE_KEYS)[number])}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">{e.eventType}</td>
                        <td className="py-2 pr-3">{e.action ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-400">
                          {e.resourceType && e.resourceId
                            ? `${e.resourceType}:${e.resourceId.slice(0, 8)}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <Link
                            href={filterBase({ userId: e.userId })}
                            className="text-sky-300 hover:underline"
                          >
                            {userRow?.userName ?? e.userId.slice(0, 8)}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">
              Showing up to 100 events ({eventsResult.total} usage events in database for filters).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
