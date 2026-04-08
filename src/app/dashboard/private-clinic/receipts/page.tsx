import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicCommon, privateClinicReceipts } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyReceipt } from "../actions";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const r = privateClinicReceipts(uiLanguage);

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
        <h2 className="text-lg font-medium text-slate-200">{r.newReceipt}</h2>
        <form
          action={createTherapyReceipt}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <select
            name="job_id"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{c.job}</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.job_title}
              </option>
            ))}
          </select>
          <input
            name="receipt_number"
            placeholder={r.receiptNumber}
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
            placeholder={r.totalAmount}
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
            <option value="client">{r.recipientClient}</option>
            <option value="organization">{r.recipientOrg}</option>
          </select>
          <select
            name="payment_method"
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="cash">{r.paymentCash}</option>
            <option value="bank_transfer">{r.paymentBank}</option>
            <option value="digital_card">{r.paymentDigital}</option>
            <option value="credit_card">{r.paymentCredit}</option>
          </select>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{c.linkBankOptional}</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label={r.linkTxPayment}
              hint={r.linkTxPaymentHint}
              noneOptionLabel={c.txNoneLinked}
            />
          </div>
          <textarea
            name="notes"
            placeholder={c.notes}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {r.createAllocate}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{r.receiptsHeading}</h2>
        {receipts.length === 0 ? (
          <p className="text-sm text-slate-500">{c.receiptsEmpty}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">{r.tableNumber}</th>
                  <th className="px-3 py-2 text-slate-300">{r.tableDate}</th>
                  <th className="px-3 py-2 text-slate-300">{r.tableJob}</th>
                  <th className="px-3 py-2 text-slate-300">{r.tableAmount}</th>
                  <th className="px-3 py-2 text-slate-300">{r.tableView}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-100">{rec.receipt_number}</td>
                    <td className="px-3 py-2 text-slate-400">{String(rec.issued_at)}</td>
                    <td className="px-3 py-2 text-slate-400">{rec.job.job_title}</td>
                    <td className="px-3 py-2 text-slate-200">
                      {rec.total_amount.toString()} {rec.currency}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/dashboard/private-clinic/receipts/${rec.id}`} className="text-xs text-sky-400">
                        {r.open}
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
