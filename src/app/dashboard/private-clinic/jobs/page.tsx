import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentHouseholdDateDisplayFormat, getCurrentUiLanguage } from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { redirect } from "next/navigation";
import { createTherapyJob, updateTherapyJob } from "../actions";

export const dynamic = "force-dynamic";

function employmentTypeLabel(t: string) {
  switch (t) {
    case "employee":
      return "Employee";
    case "freelancer":
      return "Freelancer";
    case "self_employed":
      return "Self-employed";
    case "contractor_via_company":
      return "Contractor via company";
    default:
      return t;
  }
}

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
  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const jobs = familyMemberId
    ? await prisma.jobs.findMany({
        where: { household_id: householdId, family_member_id: familyMemberId },
        orderBy: [{ is_active: "desc" }, { start_date: "desc" }, { created_at: "desc" }],
      })
    : [];

  return (
    <div className="space-y-8">
      {resolved?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {resolved.error === "family"
            ? "Your user is not linked to a family member yet. Link the user to a family member to manage clinic jobs."
            : "Could not save job. Please review the fields and try again."}
        </p>
      )}
      {(resolved?.created || resolved?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{uiLanguage === "he" ? "הוספת עבודה" : "Add job"}</h2>
        <form action={createTherapyJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
          <select name="employment_type" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{uiLanguage === "he" ? "סוג העסקה" : "Employment type"}</option>
            <option value="employee">Regular employee</option>
            <option value="freelancer">Freelancer</option>
            <option value="self_employed">Self-employed</option>
            <option value="contractor_via_company">Contractor via company</option>
          </select>
          <input
            name="job_title"
            placeholder="Job title"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_name"
            placeholder="Employer (optional)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">Start date</label>
            <input
              name="start_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">End date</label>
            <input
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <input
            name="employer_tax_number"
            placeholder="Employer tax number (optional)"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_address"
            placeholder="Employer address (optional)"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            Active
          </label>
          <textarea
            name="notes"
            placeholder="Notes"
            className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
            {uiLanguage === "he" ? "הוספת עבודה" : "Add job"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{uiLanguage === "he" ? "עבודות" : "Jobs"}</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-slate-500">No jobs yet for your linked family member.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <details key={job.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                <summary className="cursor-pointer text-sm text-slate-100">
                  {job.job_title} {job.employer_name ? `- ${job.employer_name}` : ""}{" "}
                  <span className="text-slate-400">({job.is_active ? "Active" : "Inactive"})</span>
                </summary>
                <form action={updateTherapyJob} className="mt-3 grid gap-2 md:grid-cols-3">
                  <input type="hidden" name="id" value={job.id} />
                  <select
                    name="employment_type"
                    defaultValue={job.employment_type}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="employee">Regular employee</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="contractor_via_company">Contractor via company</option>
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
                    placeholder="Employer"
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
                    placeholder="Employer tax number"
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name="employer_address"
                    defaultValue={job.employer_address ?? ""}
                    placeholder="Employer address"
                    className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input type="checkbox" name="is_active" defaultChecked={job.is_active} />
                    Active
                  </label>
                  <textarea
                    name="notes"
                    defaultValue={job.notes ?? ""}
                    placeholder="Notes"
                    className="md:col-span-3 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <div className="md:col-span-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">
                      {employmentTypeLabel(job.employment_type)} · {formatHouseholdDate(job.start_date, dateDisplayFormat)}
                      {" - "}
                      {job.end_date ? formatHouseholdDate(job.end_date, dateDisplayFormat) : "Present"}
                    </p>
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      {uiLanguage === "he" ? "שמירה" : "Save"}
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
