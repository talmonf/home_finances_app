import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicCommon, privateClinicJobs, privateClinicPrograms } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyProgram } from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import { ProgramModalForm } from "./program-modal-form";

export const dynamic = "force-dynamic";

const PROGRAMS_BASE = "/dashboard/private-clinic/programs";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string; modal?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const pr = privateClinicPrograms(uiLanguage);
  const j = privateClinicJobs(uiLanguage);

  const resolved = searchParams ? await searchParams : undefined;
  const modalMode = resolved?.modal === "new" ? "new" : null;

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

  const errorMessage =
    resolved?.error === "missing"
      ? pr.programErrMissing
      : resolved?.error === "job"
        ? pr.programErrJob
        : resolved?.error === "notfound"
          ? pr.programErrNotfound
          : resolved?.error === "id"
            ? pr.programErrId
            : resolved?.error
              ? c.saveFailedGeneric
              : null;

  return (
    <div className="space-y-8">
      {errorMessage && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {errorMessage}
        </p>
      )}
      {(resolved?.created || resolved?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{pr.programsHeading}</h2>
          <Link
            href={`${PROGRAMS_BASE}?modal=new`}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {pr.addProgramBtn}
          </Link>
        </div>
        {!familyMemberId && (
          <p className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">{j.clinicUnlinkedHint}</p>
        )}
        {programs.length === 0 ? (
          <p className="text-sm text-slate-500">{c.programsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {pr.tableName}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {pr.tableJob}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {pr.tableSort}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {pr.tableActive}
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {pr.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {programs.map((p) => {
                  const jobLabel = formatJobDisplayLabel(p.job);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/50">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-200">{p.name}</td>
                      <td className="max-w-[14rem] truncate px-3 py-2 text-slate-300" title={jobLabel}>
                        {jobLabel}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">{p.sort_order}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                        {p.is_active ? c.active : c.inactive}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link
                          href={`${PROGRAMS_BASE}/${p.id}/edit`}
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
      </section>

      {modalMode === "new" ? (
        <ProgramModalForm
          action={createTherapyProgram}
          jobs={jobs}
          closeHref={PROGRAMS_BASE}
          redirectOnSuccess={`${PROGRAMS_BASE}?created=1`}
          redirectOnError={`${PROGRAMS_BASE}?modal=new`}
          c={c}
          pr={pr}
        />
      ) : null}
    </div>
  );
}
