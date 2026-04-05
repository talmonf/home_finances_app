import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { redirect } from "next/navigation";
import {
  createTherapyConsultation,
  deleteTherapyConsultation,
  updateTherapyConsultation,
} from "../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; updated?: string; error?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const sp = searchParams ? await searchParams : undefined;

  const [jobs, types, rows] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultations.findMany({
      where: { household_id: householdId },
      orderBy: { occurred_at: "desc" },
      take: 200,
      include: { job: true, consultation_type: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-500">
        Log meetings and consultations: expected income, costs, type, and job. Manage custom
        types under Settings. Link bank lines separately for money in vs money out.
      </p>
      {sp?.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}
      {(sp?.created || sp?.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Add consultation / meeting</h2>
        <form
          action={createTherapyConsultation}
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
            name="consultation_type_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-slate-400">Date &amp; time</label>
            <input
              name="occurred_at"
              type="datetime-local"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-slate-400">Amount to receive (income)</label>
              <div className="mt-1 flex gap-2">
                <input
                  name="income_amount"
                  placeholder="0.00"
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="income_currency"
                  defaultValue="ILS"
                  className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400">Amount it cost you</label>
              <div className="mt-1 flex gap-2">
                <input
                  name="cost_amount"
                  placeholder="0.00"
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
                <input
                  name="cost_currency"
                  defaultValue="ILS"
                  className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <TherapyTransactionLinkSelect
              name="linked_income_transaction_id"
              householdId={householdId}
              label="Link transaction — clinic income"
              hint="Usually a credit (incoming) on your bank statement."
            />
          </div>
          <div className="md:col-span-2">
            <TherapyTransactionLinkSelect
              name="linked_cost_transaction_id"
              householdId={householdId}
              label="Link transaction — cost / expense"
              hint="Usually a debit (payment) for this meeting."
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
            Save
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Recent</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No entries yet.</p>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <details
                key={r.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <summary className="cursor-pointer text-sm text-slate-200">
                  {formatHouseholdDateUtcWithTime(r.occurred_at, dateDisplayFormat)} — {r.consultation_type.name}{" "}
                  — {r.job.job_title}
                </summary>
                <form action={updateTherapyConsultation} className="mt-3 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select
                    name="job_id"
                    defaultValue={r.job_id}
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
                    name="consultation_type_id"
                    defaultValue={r.consultation_type_id}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    name="occurred_at"
                    type="datetime-local"
                    defaultValue={r.occurred_at.toISOString().slice(0, 16)}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                  />
                  <div className="flex gap-1">
                    <input
                      name="income_amount"
                      defaultValue={r.income_amount?.toString() ?? ""}
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <input
                      name="income_currency"
                      defaultValue={r.income_currency}
                      className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="flex gap-1">
                    <input
                      name="cost_amount"
                      defaultValue={r.cost_amount?.toString() ?? ""}
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                    <input
                      name="cost_currency"
                      defaultValue={r.cost_currency}
                      className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TherapyTransactionLinkSelect
                      name="linked_income_transaction_id"
                      householdId={householdId}
                      currentId={r.linked_income_transaction_id}
                      label="Income transaction"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TherapyTransactionLinkSelect
                      name="linked_cost_transaction_id"
                      householdId={householdId}
                      currentId={r.linked_cost_transaction_id}
                      label="Cost transaction"
                    />
                  </div>
                  <textarea
                    name="notes"
                    defaultValue={r.notes ?? ""}
                    className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                  />
                  <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                    Save
                  </button>
                </form>
                <ConfirmDeleteForm action={deleteTherapyConsultation} className="mt-2">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs text-rose-400">
                    Delete
                  </button>
                </ConfirmDeleteForm>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
