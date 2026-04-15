import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicCommon, privateClinicJobs, privateClinicPrograms } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import {
  createTherapyProgram,
  deleteTherapyProgram,
  saveTherapyProgramVisitTypeDefaults,
  updateTherapyProgram,
} from "../actions";
import { therapyVisitTypesOrdered } from "@/lib/therapy/visit-type-defaults";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

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
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
      }),
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        job: {
          ...jobWhereInPrivateClinicModule,
          ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
        },
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
  ]);

  const programVisitDefaults =
    programs.length > 0
      ? await prisma.therapy_visit_type_default_amounts.findMany({
          where: {
            household_id: householdId,
            program_id: { in: programs.map((p) => p.id) },
          },
        })
      : [];

  const visitTypes = therapyVisitTypesOrdered();

  function programDefaultFor(programId: string, vt: (typeof visitTypes)[number]) {
    const row = programVisitDefaults.find((r) => r.program_id === programId && r.visit_type === vt);
    return row ? { amount: row.amount.toString(), currency: row.currency } : { amount: "", currency: "ILS" };
  }

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
          <div className="space-y-3">
            {programs.map((p) => (
              <details key={p.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <summary className="cursor-pointer text-sm text-slate-100">
                  {p.name}{" "}
                  <span className="text-slate-400">
                    ({p.job.job_title}
                    {p.job.employer_name ? ` — ${p.job.employer_name}` : ""}) · {p.is_active ? c.active : c.inactive}
                  </span>
                </summary>
                <form action={updateTherapyProgram} className="mt-3 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="id" value={p.id} />
                  <input
                    name="name"
                    defaultValue={p.name}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="sort_order"
                    type="number"
                    defaultValue={p.sort_order}
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-300 md:col-span-2">
                    <input type="checkbox" name="is_active" defaultChecked={p.is_active} />
                    {pr.active}
                  </label>
                  <textarea
                    name="description"
                    defaultValue={p.description ?? ""}
                    placeholder={c.description}
                    className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      {c.save}
                    </button>
                    <ConfirmDeleteForm action={deleteTherapyProgram}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                        {c.delete}
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </form>
                <div className="mt-4 border-t border-slate-700 pt-3">
                  <h3 className="mb-2 text-sm font-medium text-slate-200">{c.defaultFeesByVisitType}</h3>
                  <p className="mb-2 text-xs text-slate-500">{c.defaultFeesByVisitTypeHint}</p>
                  <form action={saveTherapyProgramVisitTypeDefaults} className="space-y-2">
                    <input type="hidden" name="program_id" value={p.id} />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {visitTypes.map((vt) => {
                        const d = programDefaultFor(p.id, vt);
                        return (
                          <div key={vt} className="rounded border border-slate-700/80 bg-slate-950/40 p-2">
                            <label className="block text-xs text-slate-400">{therapyVisitTypeLabel(uiLanguage, vt)}</label>
                            <input
                              name={`amount_${vt}`}
                              type="text"
                              defaultValue={d.amount}
                              placeholder="0.00"
                              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                            <input
                              name={`currency_${vt}`}
                              type="text"
                              defaultValue={d.currency}
                              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                            />
                          </div>
                        );
                      })}
                    </div>
                    <button type="submit" className="rounded bg-slate-600 px-2 py-1 text-xs text-white hover:bg-slate-500">
                      {c.saveDefaults}
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
