import { getAuthSession, prisma } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ImportAuditsAdminPage() {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const audits = await prisma.therapy_import_audits.findMany({
    orderBy: { created_at: "desc" },
    take: 300,
    select: {
      id: true,
      household_id: true,
      user_id: true,
      status: true,
      profile: true,
      started_at: true,
      completed_at: true,
      duration_ms: true,
      created_clients: true,
      created_treatments: true,
      created_receipts: true,
      created_allocations: true,
      created_consultations: true,
      created_travel: true,
      created_programs: true,
      blocking_errors_count: true,
      warnings_count: true,
      failure_message: true,
      household: {
        select: { name: true },
      },
    },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-7xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">
            <Link href="/admin/households" className="text-sky-400 hover:underline">
              ← Back to households
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">Therapy import audit log (super admin)</h1>
          <p className="text-sm text-slate-400">
            Non-PII operational log. Client names, receipt numbers, and imported workbook contents are intentionally
            excluded.
          </p>
        </header>

        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          {audits.length === 0 ? (
            <p className="text-sm text-slate-400">No import attempts were logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-700 uppercase text-slate-400">
                    <th className="py-2 pr-3">Started</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Duration</th>
                    <th className="py-2 pr-3">Household</th>
                    <th className="py-2 pr-3">User ID</th>
                    <th className="py-2 pr-3">Profile</th>
                    <th className="py-2 pr-3">Created totals</th>
                    <th className="py-2 pr-3">Warnings/Blocking</th>
                    <th className="py-2 pr-3">Failure summary</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-b border-slate-800 align-top last:border-0">
                      <td className="py-2 pr-3 text-slate-300">{new Date(a.started_at).toLocaleString("en-CA")}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            a.status === "successful"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : a.status === "failed"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-amber-500/20 text-amber-200"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-300">
                        {typeof a.duration_ms === "number" ? `${Math.round(a.duration_ms / 1000)}s` : "—"}
                      </td>
                      <td className="py-2 pr-3 text-slate-300">{a.household.name}</td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-slate-400">{a.user_id}</td>
                      <td className="py-2 pr-3 text-slate-300">{a.profile}</td>
                      <td className="py-2 pr-3 text-slate-300">
                        C={a.created_clients}, T={a.created_treatments}, R={a.created_receipts}, A={a.created_allocations},
                        Cons={a.created_consultations}, Trv={a.created_travel}, Prog={a.created_programs}
                      </td>
                      <td className="py-2 pr-3 text-slate-300">
                        {a.warnings_count}/{a.blocking_errors_count}
                      </td>
                      <td className="max-w-sm truncate py-2 pr-3 text-slate-400" title={a.failure_message ?? ""}>
                        {a.failure_message ?? "—"}
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
