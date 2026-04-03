import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTherapyJobExpense, deleteTherapyJobExpense, updateTherapyJobExpense } from "../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { TherapyExpenseImageUpload } from "@/components/therapy-expense-image-upload";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const [jobs, categories, expenses] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_expense_categories.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_job_expenses.findMany({
      where: { household_id: householdId },
      orderBy: { expense_date: "desc" },
      take: 200,
      include: { job: true, category: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Add expense</h2>
        <form
          action={createTherapyJobExpense}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <select
            name="category_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
            placeholder="Amount"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="currency"
            defaultValue="ILS"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">Link bank transaction (optional)</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label="Link bank transaction — clinic expense"
              hint="Optional: link a debit or outgoing payment for this expense."
            />
          </div>
          <textarea
            name="notes"
            placeholder="Notes"
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save expense
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Expenses</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500">No expenses yet.</p>
        ) : (
          <div className="space-y-6">
            {expenses.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 space-y-3"
              >
                <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-300">
                  <span>
                    {String(e.expense_date)} — {e.job.job_title} — {e.category.name}
                  </span>
                  <span className="text-slate-100">
                    {e.amount.toString()} {e.currency}
                  </span>
                </div>
                {e.notes && <p className="text-sm text-slate-400">{e.notes}</p>}
                {e.image_storage_url && (
                  <a
                    href={e.image_storage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-400"
                  >
                    View receipt image
                  </a>
                )}
                <TherapyExpenseImageUpload expenseId={e.id} />
                <details>
                  <summary className="cursor-pointer text-xs text-slate-500">Edit / delete</summary>
                  <form action={updateTherapyJobExpense} className="mt-2 grid gap-2 md:grid-cols-2">
                    <input type="hidden" name="id" value={e.id} />
                    <select
                      name="job_id"
                      defaultValue={e.job_id}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    >
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.job_title}
                        </option>
                      ))}
                    </select>
                    <select
                      name="category_id"
                      defaultValue={e.category_id}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      name="expense_date"
                      type="date"
                      defaultValue={e.expense_date.toISOString().slice(0, 10)}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <input
                      name="amount"
                      defaultValue={e.amount.toString()}
                      required
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <input
                      name="currency"
                      defaultValue={e.currency}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <div className="md:col-span-2">
                      <TherapyTransactionLinkSelect
                        name="linked_transaction_id"
                        householdId={householdId}
                        currentId={e.linked_transaction_id}
                        label="Clinic expense (optional)"
                      />
                    </div>
                    <textarea
                      name="notes"
                      defaultValue={e.notes ?? ""}
                      className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                      Save
                    </button>
                  </form>
                  <ConfirmDeleteForm action={deleteTherapyJobExpense} className="mt-2">
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className="text-xs text-rose-400">
                      Delete expense
                    </button>
                  </ConfirmDeleteForm>
                </details>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
