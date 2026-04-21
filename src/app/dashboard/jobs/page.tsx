import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createJob } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
};

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

export default async function JobsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const resolved = searchParams ? await searchParams : undefined;

  const [jobs, familyMembers, bankAccounts, creditCards] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId },
      include: { family_member: true },
      orderBy: [{ start_date: "desc" }, { created_at: "desc" }],
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ bank_name: "asc" }, { account_name: "asc" }],
    }),
    prisma.credit_cards.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: [{ issuer_name: "asc" }, { card_name: "asc" }],
    }),
  ]);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <SetupSectionMarkNotDoneBanner
            sectionId="jobs"
            redirectPath="/dashboard/jobs"
          />
          <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
            {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "משרות" : "Jobs"}</h1>
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
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספת משרה" : "Add job"}</h2>
          <form action={createJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Family member</label>
              <select name="family_member_id" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Select family member</option>
                {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label
                className="block text-xs text-slate-400"
                title="Freelancer: direct contract as an individual. Contractor via company: contract/payment through a registered company."
              >
                Job type
              </label>
              <select name="employment_type" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                <option value="">Select job type</option>
                <option value="employee">Regular employee</option>
                <option value="freelancer">Freelancer</option>
                <option value="self_employed">Self-employed</option>
                <option value="contractor_via_company">Contractor via company</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Job title</label>
              <input name="job_title" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Start date</label>
              <input name="start_date" type="date" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">End date</label>
              <input name="end_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Employer (optional)</label>
              <input name="employer_name" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-slate-400">Employer tax number (optional)</label>
              <input name="employer_tax_number" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="block text-xs text-slate-400">Employer address (optional)</label>
              <input name="employer_address" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" defaultChecked />
              Active
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
              <span className="flex items-center gap-2">
                <input type="checkbox" name="is_private_clinic" />
                {isHebrew ? "כלול במודול הקליניקה הפרטית" : "Include in Private clinic module"}
              </span>
              <span className="text-xs font-normal text-slate-500">
                {isHebrew
                  ? "כבוי: המשרה לא תופיע ברשימות ובטפסים של הקליניקה הפרטית (טיפולים, קבלות וכו׳)."
                  : "When off, this job is hidden from Private clinic lists and forms (treatments, receipts, etc.)."}
              </span>
            </label>
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">
                {isHebrew ? "חשבון בנק מקושר (אופציונלי)" : "Linked bank account (optional)"}
              </label>
              <select
                name="bank_account_id"
                className="w-full max-w-xl rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">{isHebrew ? "ללא" : "None"}</option>
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bank_name} — {a.account_name}
                    {a.account_number ? ` (${a.account_number})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">
                {isHebrew ? "כרטיס אשראי מקושר (אופציונלי)" : "Linked credit card (optional)"}
              </label>
              <select
                name="credit_card_id"
                className="w-full max-w-xl rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                defaultValue=""
              >
                <option value="">{isHebrew ? "ללא" : "None"}</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.card_name} — {card.issuer_name} — {card.card_last_four}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">Notes</label>
              <textarea name="notes" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
            </div>
            <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">{isHebrew ? "הוספת משרה" : "Add job"}</button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "רשימת משרות" : "Jobs list"}</h2>
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
                    <th className="px-3 py-2 text-slate-300">{isHebrew ? "קליניקה" : "Clinic"}</th>
                    <th className="px-3 py-2 text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-slate-700/80 hover:bg-slate-800/40">
                      <td className="px-3 py-2 text-slate-100">{job.job_title}</td>
                      <td className="px-3 py-2 text-slate-300">{job.family_member.full_name}</td>
                      <td className="px-3 py-2 text-slate-300">{employmentTypeLabel(job.employment_type)}</td>
                      <td className="px-3 py-2 text-slate-300">{job.employer_name ?? "Self-employed / not set"}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {formatHouseholdDate(job.start_date, dateDisplayFormat)} -{" "}
                        {job.end_date ? formatHouseholdDate(job.end_date, dateDisplayFormat) : "Present"}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {job.is_private_clinic ? (isHebrew ? "כן" : "Yes") : (isHebrew ? "לא" : "No")}
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/dashboard/jobs/${job.id}`} className="text-xs text-sky-400 hover:text-sky-300">
                          {isHebrew ? "עריכה" : "Edit"}
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
