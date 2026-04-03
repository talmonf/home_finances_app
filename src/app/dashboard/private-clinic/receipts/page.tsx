import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createTherapyReceipt } from "../actions";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const [jobs, receipts] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_receipts.findMany({
      where: { household_id: householdId },
      orderBy: { issued_at: "desc" },
      take: 200,
      include: { job: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">New receipt</h2>
        <form
          action={createTherapyReceipt}
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
          <input
            name="receipt_number"
            placeholder="Receipt #"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="issued_at"
            type="date"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="total_amount"
            placeholder="Total amount"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="currency"
            defaultValue="ILS"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <select
            name="recipient_type"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="client">Client</option>
            <option value="organization">Organization</option>
          </select>
          <select
            name="payment_method"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="digital_card">Digital card</option>
            <option value="credit_card">Credit card</option>
          </select>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">Link bank transaction (optional)</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label="Link bank transaction — payment received"
              hint="Optional: incoming payment that matches this receipt."
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
            Create &amp; allocate
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Receipts</h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-slate-500">No receipts yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">#</th>
                  <th className="px-3 py-2 text-slate-300">Date</th>
                  <th className="px-3 py-2 text-slate-300">Job</th>
                  <th className="px-3 py-2 text-slate-300">Amount</th>
                  <th className="px-3 py-2 text-slate-300">View</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-100">{r.receipt_number}</td>
                    <td className="px-3 py-2 text-slate-400">{String(r.issued_at)}</td>
                    <td className="px-3 py-2 text-slate-400">{r.job.job_title}</td>
                    <td className="px-3 py-2 text-slate-200">
                      {r.total_amount.toString()} {r.currency}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/private-clinic/receipts/${r.id}`} className="text-xs text-sky-400">
                        Open
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
  );
}
