import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

const BASE = "/dashboard/private-clinic/families";

export default async function FamiliesPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const [settings, user] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { family_therapy_enabled: true },
    }),
    prisma.users.findFirst({
      where: { id: session.user.id, household_id: householdId, is_active: true },
      select: { family_member_id: true },
    }),
  ]);
  if (!settings?.family_therapy_enabled) redirect("/dashboard/private-clinic");
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const families = await prisma.therapy_families.findMany({
    where: {
      household_id: householdId,
      clients: {
        some: {
          OR: [{ default_job: jobScope }, { client_jobs: { some: { job: jobScope } } }],
        },
      },
    },
    include: {
      main_member: { select: { first_name: true, last_name: true, default_job: true } },
      members: { include: { client: { select: { id: true, first_name: true, last_name: true } } } },
    },
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "משפחות" : "Families"}</h2>
        <Link
          href={`${BASE}/new`}
          className="inline-flex items-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
        >
          {isHebrew ? "הוספת משפחה" : "Add Family"}
        </Link>
      </div>
      {families.length === 0 ? (
        <p className="text-sm text-slate-500">{isHebrew ? "אין עדיין משפחות." : "No families yet."}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="min-w-full divide-y divide-slate-700 text-sm">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{isHebrew ? "משפחה" : "Family"}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{isHebrew ? "חבר/ה מרכזי/ת" : "Main member"}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{isHebrew ? "חברים" : "Members"}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{isHebrew ? "משרה ראשית" : "Main job"}</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">{isHebrew ? "פעולות" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {families.map((family) => (
                <tr key={family.id} className="hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-slate-200">{family.name}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {[family.main_member.first_name, family.main_member.last_name ?? ""].join(" ").trim()}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{family.members.length}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {formatJobDisplayLabel(family.main_member.default_job)}
                  </td>
                  <td className="px-3 py-2">
                    <Link className="text-sky-400 hover:text-sky-300" href={`${BASE}/${family.id}/edit`}>
                      {isHebrew ? "עריכה" : "Edit"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
