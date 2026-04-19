import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicReports } from "@/lib/private-clinic-i18n";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Snapshot = {
  job_id?: string;
  client_name?: string;
  job_label?: string;
  start_at?: string;
  status?: string;
};

function snapshotFromMetadata(meta: unknown): Snapshot | null {
  if (meta == null || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const snap = m.snapshot;
  if (snap && typeof snap === "object") return snap as Snapshot;
  const after = m.after;
  if (after && typeof after === "object") return after as Snapshot;
  const before = m.before;
  if (before && typeof before === "object") return before as Snapshot;
  return null;
}

export default async function PrivateClinicReportsPage() {
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
  const r = privateClinicReports(uiLanguage);

  const allowedJobs = await prisma.jobs.findMany({
    where: { household_id: householdId, ...jobScope },
    select: { id: true },
  });
  const allowedJobIds = new Set(allowedJobs.map((j) => j.id));

  const audits = await prisma.therapy_appointment_audits.findMany({
    where: { household_id: householdId },
    include: {
      user: { select: { full_name: true } },
      appointment: { select: { job_id: true } },
    },
    orderBy: { created_at: "desc" },
    take: 200,
  });

  const filtered = audits.filter((row) => {
    if (row.appointment) return allowedJobIds.has(row.appointment.job_id);
    const snap = snapshotFromMetadata(row.metadata);
    const jid = snap?.job_id;
    if (jid && allowedJobIds.has(jid)) return true;
    return false;
  });

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/private-clinic"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Private clinic
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{r.title}</h2>
        <p className="text-sm text-slate-400">{r.intro}</p>
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-slate-100">{r.therapistDiaryTitle}</h3>
            <p className="text-sm text-slate-400">{r.therapistDiaryDesc}</p>
          </div>
          <a
            href="/api/private-clinic/reports/therapist-diary"
            className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {r.download}
          </a>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">{r.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-700/80">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-2 py-2 text-slate-300">{r.tableWhen}</th>
                  <th className="px-2 py-2 text-slate-300">{r.tableUser}</th>
                  <th className="px-2 py-2 text-slate-300">{r.tableAction}</th>
                  <th className="px-2 py-2 text-slate-300">{r.tableAppointment}</th>
                  <th className="px-2 py-2 text-slate-300">{r.tableDetails}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const snap = snapshotFromMetadata(row.metadata);
                  const detail = [
                    snap?.client_name,
                    snap?.job_label,
                    snap?.start_at,
                    snap?.status,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <tr key={row.id} className="border-b border-slate-700/60">
                      <td className="px-2 py-2 whitespace-nowrap text-slate-300">
                        {row.created_at.toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                      <td className="px-2 py-2 text-slate-200">{row.user.full_name}</td>
                      <td className="px-2 py-2 text-slate-300">{row.action}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-400">
                        {row.appointment_id ?? "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-400 max-w-md truncate" title={detail}>
                        {detail || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
