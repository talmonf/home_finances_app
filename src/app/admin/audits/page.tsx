import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession, prisma } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function GeneralAuditsAdminPage() {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) redirect("/");

  const events = await prisma.general_audit_events.findMany({
    orderBy: { created_at: "desc" },
    take: 500,
    select: {
      id: true,
      household_id: true,
      actor_email: true,
      actor_name: true,
      actor_is_super_admin: true,
      feature: true,
      action: true,
      status: true,
      summary: true,
      created_at: true,
    },
  });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-7xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <p className="text-sm text-slate-400">
            <Link href="/" className="text-sky-400 hover:underline">
              ← Back to Home
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-slate-50">General audit log (super admin)</h1>
          <p className="text-sm text-slate-400">
            Unified audit stream for export, import, backup, and restore actions.
          </p>
        </header>
        <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 uppercase text-slate-400">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Feature</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Household</th>
                <th className="py-2 pr-3">Actor</th>
                <th className="py-2 pr-3">Summary</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-slate-800 align-top last:border-0">
                  <td className="py-2 pr-3 text-slate-300">{new Date(e.created_at).toLocaleString("en-CA")}</td>
                  <td className="py-2 pr-3 text-slate-300">{e.feature}</td>
                  <td className="py-2 pr-3 text-slate-300">{e.action}</td>
                  <td className="py-2 pr-3 text-slate-300">{e.status}</td>
                  <td className="py-2 pr-3 text-slate-300">{e.household_id?.slice(0, 8) ?? "global"}</td>
                  <td className="py-2 pr-3 text-slate-300">
                    {e.actor_name ?? e.actor_email ?? (e.actor_is_super_admin ? "super admin" : "user")}
                  </td>
                  <td className="py-2 pr-3 text-slate-400">{e.summary ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
