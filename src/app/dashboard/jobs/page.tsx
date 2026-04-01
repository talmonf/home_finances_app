import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createJob } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
};

function dateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function JobsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : undefined;

  const [jobs, familyMembers] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId },
      include: { family_member: true },
      orderBy: [{ start_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Jobs</h1>
          <p className="text-sm text-slate-400">
            Record jobs, payroll history, benefits, and employment documents per family member.
          </p>
          {(resolved?.created || resolved?.updated || resolved?.error) && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                resolved.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              {resolved.error
                ? decodeURIComponent(resolved.error.replace(/\+/g, " "))
                : resolved.created
                  ? "Job added."
                  : "Updated."}
            </div>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Add job</h2>
          <form action={createJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <select name="family_member_id" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Family member</option>
              {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <select name="employment_type" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="">Employment type</option>
              <option value="employee">Regular employee</option>
              <option value="freelancer">Freelancer</option>
            </select>
            <input name="job_title" placeholder="Job title" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Start date</label>
              <input name="start_date" type="date" required defaultValue={dateInputValue(new Date())} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">End date</label>
              <input name="end_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <input name="employer_name" placeholder="Employer (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employer_tax_number" placeholder="Employer tax number (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employer_address" placeholder="Employer address (optional)" className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>
            <textarea name="notes" placeholder="Notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add job</button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Jobs list</h2>
          {jobs.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-sm text-slate-400">
              No jobs yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-3 py-2 text-slate-300">Title</th>
                    <th className="px-3 py-2 text-slate-300">Family member</th>
                    <th className="px-3 py-2 text-slate-300">Type</th>
                    <th className="px-3 py-2 text-slate-300">Employer</th>
                    <th className="px-3 py-2 text-slate-300">Dates</th>
                    <th className="px-3 py-2 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-100">
                        <Link href={`/dashboard/jobs/${job.id}`} className="text-sky-400 hover:text-sky-300">
                          {job.job_title}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{job.family_member.full_name}</td>
                      <td className="px-3 py-2 text-slate-300">{job.employment_type === "employee" ? "Employee" : "Freelancer"}</td>
                      <td className="px-3 py-2 text-slate-300">{job.employer_name ?? "Self-employed / not set"}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {dateInputValue(job.start_date)} - {dateInputValue(job.end_date) || "Present"}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/jobs/${job.id}`} className="text-xs text-sky-400 hover:text-sky-300">
                          Edit
                        </Link>
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
