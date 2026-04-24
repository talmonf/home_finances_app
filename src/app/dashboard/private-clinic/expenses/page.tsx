import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatDecimalAmountForDisplay } from "@/lib/privacy-display";
import { privateClinicCommon, privateClinicExpenses } from "@/lib/private-clinic-i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTherapyJobExpense, deleteTherapyJobExpense, updateTherapyJobExpense } from "../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { DirectFileOpenDownloadLinks } from "@/components/file-open-download-links";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { TherapyExpenseImageUpload } from "@/components/therapy-expense-image-upload";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import { jobWherePrivateClinicScoped, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

const EXPENSES_BASE = "/dashboard/private-clinic/expenses";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string; modal?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const ex = privateClinicExpenses(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;
  const modalMode = resolved?.modal === "new" ? "new" : null;

  const [jobs, categories, expenses] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_job_expenses.findMany({
      where: { household_id: householdId, job: jobScope },
      orderBy: { expense_date: "desc" },
      take: 200,
      include: { job: true, category: true },
    }),
  ]);

  return (
    <div className="space-y-6 sm:space-y-8">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{ex.expensesHeading}</h2>
          <Link
            href={`${EXPENSES_BASE}?modal=new`}
            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
          >
            {ex.addExpense}
          </Link>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500">{c.expensesEmpty}</p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="space-y-2.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:space-y-3 sm:p-4"
              >
                <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-300">
                  <span>
                    {String(e.expense_date)} — {formatJobDisplayLabel(e.job)} —{" "}
                    {therapyLocalizedCategoryName(e.category, uiLanguage)}
                  </span>
                  <span className="text-slate-100">
                    {formatDecimalAmountForDisplay(obfuscate, e.amount, e.currency, uiLanguage)}
                  </span>
                </div>
                {e.notes && <p className="text-sm text-slate-400">{e.notes}</p>}
                {e.image_storage_url ? (
                  <DirectFileOpenDownloadLinks
                    href={e.image_storage_url}
                    fileName={e.image_file_name?.trim() || "receipt"}
                  />
                ) : null}
                <TherapyExpenseImageUpload expenseId={e.id} />
                <details>
                  <summary className="cursor-pointer text-xs text-slate-500">{c.editDelete}</summary>
                  <form action={updateTherapyJobExpense} className="mt-2 grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="id" value={e.id} />
                    <select
                      name="job_id"
                      defaultValue={e.job_id}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {formatJobDisplayLabel(j)}
                        </option>
                      ))}
                    </select>
                    <select
                      name="category_id"
                      defaultValue={e.category_id}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {therapyLocalizedCategoryName(cat, uiLanguage)}
                        </option>
                      ))}
                    </select>
                    <input
                      name="expense_date"
                      type="date"
                      defaultValue={e.expense_date.toISOString().slice(0, 10)}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      name="amount"
                      defaultValue={e.amount.toString()}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      name="currency"
                      defaultValue={e.currency}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <div className="md:col-span-2">
                      <TherapyTransactionLinkSelect
                        name="linked_transaction_id"
                        householdId={householdId}
                        currentId={e.linked_transaction_id}
                        label={ex.clinicExpenseOptional}
                        noneOptionLabel={c.txNoneLinked}
                      />
                    </div>
                    <textarea
                      name="notes"
                      defaultValue={e.notes ?? ""}
                      className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1.5 text-xs text-white">
                      {c.save}
                    </button>
                  </form>
                  <ConfirmDeleteForm action={deleteTherapyJobExpense} className="mt-2">
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs text-rose-400">
                      {c.deleteExpense}
                    </button>
                  </ConfirmDeleteForm>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalMode === "new" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4 sm:px-4 sm:py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-100">{ex.addExpense}</h3>
              <Link href={EXPENSES_BASE} className="text-sm text-slate-400 hover:text-slate-200">
                {c.cancel}
              </Link>
            </div>
            <form action={createTherapyJobExpense} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="redirect_on_success" value={`${EXPENSES_BASE}?created=1`} />
              <input type="hidden" name="redirect_on_error" value={`${EXPENSES_BASE}?modal=new`} />
              <select
                name="job_id"
                required
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{c.job}</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {formatJobDisplayLabel(j)}
                  </option>
                ))}
              </select>
              <select
                name="category_id"
                required
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{c.category}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {therapyLocalizedCategoryName(cat, uiLanguage)}
                  </option>
                ))}
              </select>
              <input
                name="expense_date"
                type="date"
                required
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="amount"
                placeholder={c.amount}
                required
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <input
                name="currency"
                defaultValue="ILS"
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400">{c.linkBankOptional}</label>
                <TherapyTransactionLinkSelect
                  name="linked_transaction_id"
                  householdId={householdId}
                  label={ex.linkTxExpense}
                  hint={ex.linkTxExpenseHint}
                  noneOptionLabel={c.txNoneLinked}
                />
              </div>
              <textarea
                name="notes"
                placeholder={c.notes}
                className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-fit"
                >
                  {c.saveExpense}
                </button>
                <Link href={EXPENSES_BASE} className="text-sm text-slate-400 hover:text-slate-200">
                  {c.cancel}
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
