import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { employmentTypeOptionLabel, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyJob, updateTherapyJob } from "../actions";

export const dynamic = "force-dynamic";

export default async function PrivateClinicJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const j = privateClinicJobs(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, householdMembers] = await Promise.all([
    prisma.jobs.findMany({
      where: {
        household_id: householdId,
        ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
      },
      orderBy: [{ is_active: "desc" }, { start_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
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
        <h2 className="text-lg font-medium text-slate-200">{j.addJobTitle}</h2>
        {!canAddJob ? (
          <p className="text-sm text-amber-200/90">{j.needMemberBeforeJob}</p>
        ) : (
          <form action={createTherapyJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            {!familyMemberId ? (
              <div className="md:col-span-3 space-y-1">
                <label className="block text-xs text-slate-400">{j.employedPerson}</label>
                <select
                  name="family_member_id"
                  required
                  className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">{c.select}</option>
                  {householdMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">{j.employedPersonHelp}</p>
              </div>
            ) : null}
            <select name="employment_type" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">{j.employmentType}</option>
              <option value="employee">{employmentTypeOptionLabel(uiLanguage, "employee")}</option>
              <option value="freelancer">{employmentTypeOptionLabel(uiLanguage, "freelancer")}</option>
              <option value="self_employed">{employmentTypeOptionLabel(uiLanguage, "self_employed")}</option>
              <option value="contractor_via_company">{employmentTypeOptionLabel(uiLanguage, "contractor_via_company")}</option>
            </select>
            <input
              name="job_title"
              placeholder={j.jobTitle}
              required
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="employer_name"
              placeholder={j.employerOptional}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">{c.startDate}</label>
              <input
                name="start_date"
                type="date"
                required
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">{c.endDate}</label>
              <input
                name="end_date"
                type="date"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </div>
            <input
              name="employer_tax_number"
              placeholder={j.employerTaxOptional}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <input
              name="employer_address"
              placeholder={j.employerAddressOptional}
              className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" defaultChecked />
              {c.active}
            </label>
            <textarea
              name="notes"
              placeholder={c.notes}
              className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              {j.addJobBtn}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{j.jobsHeading}</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">
            {familyMemberId ? c.noJobsForMember : j.noJobsInHousehold}
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <details key={job.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <summary className="cursor-pointer text-sm text-slate-100">
                  {job.job_title} {job.employer_name ? `- ${job.employer_name}` : ""}{" "}
                  <span className="text-slate-400">({job.is_active ? c.active : c.inactive})</span>
                </summary>
                <form action={updateTherapyJob} className="mt-3 grid gap-2 md:grid-cols-3">
                  <input type="hidden" name="id" value={job.id} />
                  <select
                    name="employment_type"
                    defaultValue={job.employment_type}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="employee">{employmentTypeOptionLabel(uiLanguage, "employee")}</option>
                    <option value="freelancer">{employmentTypeOptionLabel(uiLanguage, "freelancer")}</option>
                    <option value="self_employed">{employmentTypeOptionLabel(uiLanguage, "self_employed")}</option>
                    <option value="contractor_via_company">{employmentTypeOptionLabel(uiLanguage, "contractor_via_company")}</option>
                  </select>
                  <input
                    name="job_title"
                    defaultValue={job.job_title}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="employer_name"
                    defaultValue={job.employer_name ?? ""}
                    placeholder={c.employer}
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="start_date"
                    type="date"
                    defaultValue={job.start_date.toISOString().slice(0, 10)}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="end_date"
                    type="date"
                    defaultValue={job.end_date ? job.end_date.toISOString().slice(0, 10) : ""}
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="employer_tax_number"
                    defaultValue={job.employer_tax_number ?? ""}
                    placeholder={j.employerTaxOptional}
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="employer_address"
                    defaultValue={job.employer_address ?? ""}
                    placeholder={j.employerAddressOptional}
                    className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" name="is_active" defaultChecked={job.is_active} />
                    {c.active}
                  </label>
                  <textarea
                    name="notes"
                    defaultValue={job.notes ?? ""}
                    placeholder={c.notes}
                    className="md:col-span-3 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <div className="md:col-span-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {employmentTypeOptionLabel(uiLanguage, job.employment_type)} · {formatHouseholdDate(job.start_date, dateDisplayFormat)}
                      {" - "}
                      {job.end_date ? formatHouseholdDate(job.end_date, dateDisplayFormat) : c.present}
                    </p>
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      {c.save}
                    </button>
                  </div>
                </form>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
