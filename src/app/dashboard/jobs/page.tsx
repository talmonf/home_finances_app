import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { SetupSectionMarkNotDoneBanner } from "@/app/dashboard/setup-section-mark-not-done-banner";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createJob } from "./actions";
import { JobsListClient } from "./jobs-list-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    add?: string;
    family_member_id?: string;
    employment_type?: string;
    tenure?: string;
  }>;
};

export default async function JobsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const resolved = searchParams ? await searchParams : undefined;
  const selectedFamilyMemberId = resolved?.family_member_id?.trim() || "";
  const selectedEmploymentType =
    resolved?.employment_type === "employee" ||
    resolved?.employment_type === "freelancer" ||
    resolved?.employment_type === "self_employed" ||
    resolved?.employment_type === "contractor_via_company"
      ? resolved.employment_type
      : "";
  const selectedTenure =
    resolved?.tenure === "current" || resolved?.tenure === "past" || resolved?.tenure === "all"
      ? resolved.tenure
      : "current";
  const showAddForm = resolved?.add === "1";

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
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-4">
      <div className="w-full max-w-6xl space-y-4 rounded-2xl bg-slate-900 p-5 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <SetupSectionMarkNotDoneBanner
            sectionId="jobs"
            redirectPath="/dashboard/jobs"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-semibold text-slate-50">{isHebrew ? "משרות" : "Jobs"}</h1>
            <Link href="/" className="text-sm text-slate-400 hover:text-slate-200">
              {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
            </Link>
          </div>
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

        <JobsListClient
          rows={jobs.map((job) => ({
            id: job.id,
            family_member_id: job.family_member_id,
            family_member_name: job.family_member.full_name,
            employment_type: job.employment_type,
            job_title: job.job_title,
            employer_name: job.employer_name,
            start_date_iso: job.start_date.toISOString(),
            end_date_iso: job.end_date ? job.end_date.toISOString() : null,
            is_private_clinic: job.is_private_clinic,
          }))}
          familyMembers={familyMembers.map((m) => ({ id: m.id, full_name: m.full_name }))}
          dateDisplayFormat={dateDisplayFormat}
          isHebrew={isHebrew}
          initialFamilyMemberId={selectedFamilyMemberId}
          initialEmploymentType={selectedEmploymentType}
          initialTenure={selectedTenure}
        />
        {showAddForm ? (
          <section className="space-y-3" id="add-job">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספת משרה" : "Add job"}</h2>
              <Link href="/dashboard/jobs" className="text-sm text-slate-300 hover:text-slate-100">
                {isHebrew ? "סגירה" : "Close"}
              </Link>
            </div>
            <form action={createJob} className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Family member</label>
                <select name="family_member_id" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                  <option value="">Select family member</option>
                  {familyMembers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <label className="block text-xs text-slate-300">Job type</label>
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500 text-[10px] text-slate-300"
                    title="Freelancer: direct contract as an individual. Contractor via company: contract/payment through a registered company."
                    aria-label="Job type help"
                  >
                    ?
                  </span>
                </div>
                <select name="employment_type" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
                  <option value="">Select job type</option>
                  <option value="employee">Regular employee</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="self_employed">Self-employed</option>
                  <option value="contractor_via_company">Contractor via company</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Job title</label>
                <input name="job_title" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Start date</label>
                <input name="start_date" type="date" required className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">End date</label>
                <input name="end_date" type="date" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Employer (optional)</label>
                <input name="employer_name" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-slate-300">Employer tax number (optional)</label>
                <input name="employer_tax_number" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="block text-xs text-slate-300">Employer address (optional)</label>
                <input name="employer_address" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="is_active" defaultChecked />
                Active
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-300 md:col-span-2">
                <span className="flex items-center gap-2">
                  <input type="checkbox" name="is_private_clinic" />
                  {isHebrew ? "כלול במודול הקליניקה" : "Include in Clinic module"}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {isHebrew
                    ? "כבוי: המשרה לא תופיע ברשימות ובטפסים של הקליניקה (טיפולים, קבלות וכו׳)."
                    : "When off, this job is hidden from Clinic lists and forms (treatments, receipts, etc.)."}
                </span>
              </label>
              <div className="space-y-1 md:col-span-3">
                <label className="block text-xs text-slate-300">
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
                <label className="block text-xs text-slate-300">
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
                <label className="block text-xs text-slate-300">Notes</label>
                <textarea name="notes" className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
              </div>
              <button type="submit" className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">{isHebrew ? "הוספת משרה" : "Add job"}</button>
            </form>
          </section>
        ) : null}
      </div>
    </div>
  );
}
