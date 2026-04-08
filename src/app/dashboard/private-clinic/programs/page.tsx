import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicCommon, privateClinicJobs, privateClinicPrograms } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyProgram, deleteTherapyProgram } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const pr = privateClinicPrograms(uiLanguage);
  const j = privateClinicJobs(uiLanguage);

  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, programs] = await Promise.all([
    prisma.jobs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
      },
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        ...(familyMemberId ? { job: { family_member_id: familyMemberId } } : {}),
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
  ]);

  return (
    <div className="space-y-8">
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{pr.addProgramTitle}</h2>
        <form
          action={createTherapyProgram}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{c.job}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title} {j.employer_name ? `- ${j.employer_name}` : ""} — {j.family_member.full_name}
              </option>
            ))}
          </select>
          <input
            name="name"
            placeholder={pr.programName}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <input
              name="sort_order"
              type="number"
              placeholder={c.sortOrderPh}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-xs text-slate-400">{c.sortOrderHint}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            {pr.active}
          </label>
          <textarea
            name="description"
            placeholder={c.description}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {pr.addProgramBtn}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{pr.programsHeading}</h2>
        {!familyMemberId && (
          <p className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">{j.clinicUnlinkedHint}</p>
        )}
        {programs.length === 0 ? (
          <p className="text-sm text-slate-500">{c.programsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">{pr.tableName}</th>
                  <th className="px-3 py-2 text-slate-300">{c.job}</th>
                  <th className="px-3 py-2 text-slate-300">{c.tableSort}</th>
                  <th className="px-3 py-2 text-slate-300">{pr.tableActive}</th>
                  <th className="px-3 py-2 text-slate-300">{c.tableDelete}</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-100">{p.name}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {p.job.job_title} {p.job.employer_name ? `- ${p.job.employer_name}` : ""}
                    </td>
                    <td className="px-3 py-2 text-slate-400">{p.sort_order}</td>
                    <td className="px-3 py-2 text-slate-400">{p.is_active ? c.yes : c.no}</td>
                    <td className="px-3 py-2">
                      <ConfirmDeleteForm action={deleteTherapyProgram}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                          {c.delete}
                        </button>
                      </ConfirmDeleteForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
