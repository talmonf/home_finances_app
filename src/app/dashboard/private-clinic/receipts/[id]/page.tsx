import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import {
  deleteReceiptAllocation,
  updateTherapyReceipt,
  upsertReceiptAllocation,
} from "../../actions";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function ReceiptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string }>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;

  const receipt = await prisma.therapy_receipts.findFirst({
    where: { id, household_id: householdId },
    include: {
      job: true,
      allocations: { include: { treatment: { include: { client: true } } } },
    },
  });
  if (!receipt) notFound();

  const [jobs, treatments] = await Promise.all([
    prisma.jobs.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId, job_id: receipt.job_id },
      orderBy: { occurred_at: "desc" },
      take: 200,
      include: { client: true },
    }),
  ]);

  const allocatedSum = receipt.allocations.reduce(
    (s, a) => s + Number(a.amount),
    0,
  );
  const totalNum = Number(receipt.total_amount);
  const match =
    Math.abs(allocatedSum - totalNum) < 0.01 ? (
      <span className="text-emerald-400">Allocations match total</span>
    ) : (
      <span className="text-amber-400">
        Allocated {allocatedSum.toFixed(2)} vs total {totalNum.toFixed(2)}
      </span>
    );

  return (
    <div className="space-y-8">
      <Link href="/dashboard/private-clinic/receipts" className="text-sm text-sky-400">
        ← Receipts
      </Link>
      {sp?.updated && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          Saved.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">Receipt {receipt.receipt_number}</h2>
        <p className="text-sm text-slate-400">{match}</p>
        <form
          action={updateTherapyReceipt}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <input type="hidden" name="id" value={receipt.id} />
          <select
            name="job_id"
            required
            defaultValue={receipt.job_id}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <input
            name="receipt_number"
            defaultValue={receipt.receipt_number}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="issued_at"
            type="date"
            defaultValue={receipt.issued_at.toISOString().slice(0, 10)}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="total_amount"
            defaultValue={receipt.total_amount.toString()}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="currency"
            defaultValue={receipt.currency}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <select
            name="recipient_type"
            defaultValue={receipt.recipient_type}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="client">Client</option>
            <option value="organization">Organization</option>
          </select>
          <select
            name="payment_method"
            defaultValue={receipt.payment_method}
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
              currentId={receipt.linked_transaction_id}
              label="Payment received (bank)"
              hint="Optional: link the credit that matches this receipt."
            />
          </div>
          <textarea
            name="notes"
            defaultValue={receipt.notes ?? ""}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Save receipt
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h3 className="text-md font-medium text-slate-200">Allocations to treatments</h3>
        <form
          action={upsertReceiptAllocation}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
        >
          <input type="hidden" name="receipt_id" value={receipt.id} />
          <select
            name="treatment_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">Treatment</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.occurred_at.toISOString().slice(0, 10)} — {t.client.first_name}{" "}
                {t.amount.toString()} {t.currency}
              </option>
            ))}
          </select>
          <input
            name="amount"
            placeholder="Amount"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            Add / update
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-3 py-2 text-slate-300">Treatment</th>
                <th className="px-3 py-2 text-slate-300">Amount</th>
                <th className="px-3 py-2 text-slate-300">Remove</th>
              </tr>
            </thead>
            <tbody>
              {receipt.allocations.map((a) => (
                <tr key={a.id} className="border-b border-slate-700/80">
                  <td className="px-3 py-2 text-slate-300">
                    {a.treatment.occurred_at.toISOString().slice(0, 10)} —{" "}
                    {a.treatment.client.first_name}
                  </td>
                  <td className="px-3 py-2 text-slate-100">{a.amount.toString()}</td>
                  <td className="px-3 py-2">
                    <form action={deleteReceiptAllocation}>
                      <input type="hidden" name="receipt_id" value={receipt.id} />
                      <input type="hidden" name="treatment_id" value={a.treatment_id} />
                      <button type="submit" className="text-xs text-rose-400">
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
