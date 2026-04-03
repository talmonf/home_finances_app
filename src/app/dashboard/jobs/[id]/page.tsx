import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createJobBenefit,
  createJobPayrollEntry,
  deleteJobBenefit,
  deleteJobDocument,
  deleteJobPayrollEntry,
  updateJob,
} from "../actions";
import JobDocumentUpload from "./JobDocumentUpload";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string }>;
};

function dateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function JobDetailsPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const { id } = await params;
  const resolved = searchParams ? await searchParams : undefined;

  const [job, familyMembers, benefits, payrollEntries, documents] = await Promise.all([
    prisma.jobs.findFirst({
      where: { id, household_id: householdId },
      include: { family_member: true },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.job_benefits.findMany({
      where: { household_id: householdId, job_id: id },
      orderBy: { created_at: "desc" },
    }),
    prisma.job_payroll_entries.findMany({
      where: { household_id: householdId, job_id: id },
      orderBy: [{ effective_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.job_documents.findMany({
      where: { household_id: householdId, job_id: id },
      orderBy: { uploaded_at: "desc" },
    }),
  ]);

  if (!job) notFound();

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link href="/dashboard/jobs" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Back to jobs
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{job.job_title}</h1>
          {resolved?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Job details</h2>
          <form action={updateJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input type="hidden" name="id" value={job.id} />
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Family member</label>
              <select name="family_member_id" defaultValue={job.family_member_id} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Employment type</label>
              <select name="employment_type" defaultValue={job.employment_type} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="employee">Regular employee</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Job title</label>
              <input name="job_title" defaultValue={job.job_title} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Start date</label>
              <input name="start_date" type="date" defaultValue={dateInputValue(job.start_date)} required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">End date</label>
              <input name="end_date" type="date" defaultValue={dateInputValue(job.end_date)} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" defaultChecked={job.is_active} />
              Active
            </label>
            <input name="employer_name" defaultValue={job.employer_name ?? ""} placeholder="Employer (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employer_tax_number" defaultValue={job.employer_tax_number ?? ""} placeholder="Employer tax number (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employer_address" defaultValue={job.employer_address ?? ""} placeholder="Employer address (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <textarea name="notes" defaultValue={job.notes ?? ""} placeholder="Notes" className="md:col-span-3 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Save job</button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Benefits</h2>
          <form action={createJobBenefit} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input type="hidden" name="job_id" value={job.id} />
            <input name="benefit_type" required placeholder="Benefit type (e.g. pension)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="transfer_destination" placeholder="Transferred to (destination)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="provider_name" placeholder="Provider / insurance company" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="policy_number" placeholder="Policy number" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="terms" placeholder="Terms (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="notes" placeholder="Notes (optional)" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add benefit</button>
          </form>
          {benefits.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-700 bg-slate-800/80"><th className="px-3 py-2 text-slate-300">Type</th><th className="px-3 py-2 text-slate-300">Destination</th><th className="px-3 py-2 text-slate-300">Provider</th><th className="px-3 py-2 text-slate-300">Policy</th><th className="px-3 py-2 text-slate-300">Terms</th><th className="px-3 py-2 text-slate-300">Notes</th><th className="px-3 py-2 text-slate-300">Action</th></tr></thead>
                <tbody>
                  {benefits.map((b) => (
                    <tr key={b.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-100">{b.benefit_type}</td>
                      <td className="px-3 py-2 text-slate-300">{b.transfer_destination ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{b.provider_name ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{b.policy_number ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{b.terms ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{b.notes ?? "—"}</td>
                      <td className="px-3 py-2"><form action={deleteJobBenefit.bind(null, b.id, job.id)}><button type="submit" className="text-xs text-rose-400 hover:text-rose-300">Delete</button></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Payroll entries</h2>
          <form action={createJobPayrollEntry} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <input type="hidden" name="job_id" value={job.id} />
            <input name="effective_date" type="date" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="pay_period_start" type="date" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="pay_period_end" type="date" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <select name="period_type" defaultValue="monthly" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
              <option value="monthly">Monthly</option>
              <option value="biweekly">Biweekly</option>
              <option value="weekly">Weekly</option>
              <option value="annual">Annual</option>
              <option value="other">Other</option>
            </select>
            <input name="currency" defaultValue="ILS" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="gross_amount" type="number" step="0.01" placeholder="Gross amount" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="net_amount" type="number" step="0.01" placeholder="Net amount" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employee_deductions" type="number" step="0.01" placeholder="Employee deductions" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="employer_contributions" type="number" step="0.01" placeholder="Employer contributions" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="bonus_amount" type="number" step="0.01" placeholder="Bonus amount" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="equity_amount" type="number" step="0.01" placeholder="Equity amount" className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <input name="notes" placeholder="Notes" className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">Add payroll entry</button>
          </form>
          {payrollEntries.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-700 bg-slate-800/80"><th className="px-3 py-2 text-slate-300">Effective</th><th className="px-3 py-2 text-slate-300">Period</th><th className="px-3 py-2 text-slate-300">Gross</th><th className="px-3 py-2 text-slate-300">Net</th><th className="px-3 py-2 text-slate-300">Currency</th><th className="px-3 py-2 text-slate-300">Notes</th><th className="px-3 py-2 text-slate-300">Action</th></tr></thead>
                <tbody>
                  {payrollEntries.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-100">{dateInputValue(p.effective_date)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {p.period_type}
                        {p.pay_period_start ? ` (${dateInputValue(p.pay_period_start)} - ${dateInputValue(p.pay_period_end) || "?"})` : ""}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{p.gross_amount?.toString() ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{p.net_amount?.toString() ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-300">{p.currency}</td>
                      <td className="px-3 py-2 text-slate-300">{p.notes ?? "—"}</td>
                      <td className="px-3 py-2"><form action={deleteJobPayrollEntry.bind(null, p.id, job.id)}><button type="submit" className="text-xs text-rose-400 hover:text-rose-300">Delete</button></form></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">Documents</h2>
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
            <JobDocumentUpload jobId={job.id} />
          </div>
          {documents.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-slate-700 bg-slate-800/80"><th className="px-3 py-2 text-slate-300">File</th><th className="px-3 py-2 text-slate-300">Uploaded</th><th className="px-3 py-2 text-slate-300">Open</th><th className="px-3 py-2 text-slate-300">Action</th></tr></thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-100">{d.file_name}</td>
                      <td className="px-3 py-2 text-slate-300">{dateInputValue(d.uploaded_at)}</td>
                      <td className="px-3 py-2 text-slate-300">
                        <a
                          href={`/api/jobs/documents/${d.id}/download`}
                          className="inline-flex items-center rounded border border-sky-500 px-2 py-1 text-xs text-sky-100 hover:bg-sky-500/10"
                          target="_blank"
                          rel="noreferrer"
                          download={d.file_name}
                        >
                          Open / Download
                        </a>
                      </td>
                      <td className="px-3 py-2">
                        <form action={deleteJobDocument.bind(null, d.id, job.id)}>
                          <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                            Delete
                          </button>
                        </form>
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
