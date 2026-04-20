import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { employmentTypeOptionLabel, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyJob } from "../actions";
import { JobModalForm } from "./job-modal-form";

export const dynamic = "force-dynamic";

const JOBS_BASE = "/dashboard/private-clinic/jobs";

export default async function PrivateClinicJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string; modal?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const j = privateClinicJobs(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;
  const modalMode = resolved?.modal === "new" ? "new" : null;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, householdMembers, jobCountAnyFlag] = await Promise.all([
    prisma.jobs.findMany({
      where: {
        household_id: householdId,
        is_private_clinic: true,
        ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
      },
      orderBy: [{ is_active: "desc" }, { start_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
    }),
    prisma.jobs.count({
      where: {
        household_id: householdId,
        ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
      },
    }),
  ]);

  const canAddJob = familyMemberId ? true : householdMembers.length > 0;
  const errorMessage =
    resolved?.error === "family"
      ? c.noFamilyMemberJobs
      : resolved?.error === "member"
        ? j.invalidEmployedPerson
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

      {!familyMemberId && (
        <p className="rounded-lg border border-sky-700/50 bg-sky-950/30 px-3 py-2 text-sm text-sky-100">
          {j.clinicUnlinkedHint}
        </p>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{j.jobsHeading}</h2>
          <Link
            href={`${JOBS_BASE}?modal=new`}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${canAddJob ? "bg-sky-500 text-slate-950 hover:bg-sky-400" : "pointer-events-none cursor-not-allowed bg-slate-700 text-slate-300"}`}
            aria-disabled={!canAddJob}
          >
            {j.addJobBtn}
          </Link>
        </div>
        {!canAddJob ? <p className="text-sm text-amber-200/90">{j.needMemberBeforeJob}</p> : null}
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">
            {jobCountAnyFlag === 0
              ? familyMemberId
                ? c.noJobsForMember
                : j.noJobsInHousehold
              : j.noPrivateClinicJobsFiltered}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="min-w-full divide-y divide-slate-700 text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.tableJob}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.tableEmploymentType}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.tableExternalReportingSystem}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.tableDateRange}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.tableActive}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {j.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/50">
                    <td className="max-w-[20rem] truncate px-3 py-2 text-slate-200" title={formatJobDisplayLabel(job)}>
                      {formatJobDisplayLabel(job)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{employmentTypeOptionLabel(uiLanguage, job.employment_type)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{job.external_reporting_system ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                      {formatHouseholdDate(job.start_date, dateDisplayFormat)} - {job.end_date ? formatHouseholdDate(job.end_date, dateDisplayFormat) : c.present}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{job.is_active ? c.active : c.inactive}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link href={`${JOBS_BASE}/${job.id}/edit`} className="font-medium text-sky-400 hover:text-sky-300">
                        {c.edit}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {modalMode === "new" && canAddJob ? (
        <JobModalForm
          action={createTherapyJob}
          householdMembers={householdMembers}
          familyMemberId={familyMemberId}
          closeHref={JOBS_BASE}
          redirectOnSuccess={`${JOBS_BASE}?created=1`}
          redirectOnError={`${JOBS_BASE}?modal=new`}
          c={c}
          j={j}
          uiLanguage={uiLanguage}
        />
      ) : null}
    </div>
  );
}
