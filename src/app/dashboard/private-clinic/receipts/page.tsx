import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatDecimalAmountForDisplay } from "@/lib/privacy-display";
import { privateClinicCommon, privateClinicReceipts } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyReceipt } from "../actions";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

type ReceiptSearch = {
  job?: string;
  from?: string;
  to?: string;
  recipient?: string;
  bank?: string;
};

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptSearch>;
}) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const r = privateClinicReceipts(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const jobFilter = sp.job || "";
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;
  const recipientFilter = sp.recipient || "all";
  const bankFilter = sp.bank || "all";
  const now = new Date();
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));

  const [jobs, receipts, orgJobs] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_receipts.findMany({
      where: {
        household_id: householdId,
        job: jobWhereInPrivateClinicModule,
        ...(jobFilter ? { job_id: jobFilter } : {}),
        ...(from || to
          ? {
              issued_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(recipientFilter === "client" || recipientFilter === "organization"
          ? { recipient_type: recipientFilter as "client" | "organization" }
          : {}),
        ...(bankFilter === "linked" ? { linked_transaction_id: { not: null } } : {}),
        ...(bankFilter === "unlinked" ? { linked_transaction_id: null } : {}),
      },
      orderBy: { issued_at: "desc" },
      take: 500,
      include: { job: true },
    }),
    prisma.jobs.findMany({
      where: { household_id: householdId, is_private_clinic: false },
      select: { id: true },
    }),
  ]);
  const orgJobIds = new Set(orgJobs.map((j) => j.id));
  const treatmentSum = orgJobIds.size
    ? await prisma.therapy_treatments.aggregate({
        where: {
          household_id: householdId,
          job_id: { in: Array.from(orgJobIds) },
          occurred_at: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: null } };
  const consultationSum = orgJobIds.size
    ? await prisma.therapy_consultations.aggregate({
        where: {
          household_id: householdId,
          job_id: { in: Array.from(orgJobIds) },
          occurred_at: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { income_amount: true },
      })
    : { _sum: { income_amount: null } };
  const travelSum = orgJobIds.size
    ? await prisma.therapy_travel_entries.aggregate({
        where: {
          household_id: householdId,
          job_id: { in: Array.from(orgJobIds) },
          occurred_at: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { amount: true },
      })
    : { _sum: { amount: null } };

  const paidSum = orgJobIds.size
    ? await prisma.therapy_receipts.aggregate({
        where: {
          household_id: householdId,
          job_id: { in: Array.from(orgJobIds) },
          recipient_type: "organization",
          covered_period_start: { lte: lastMonthEnd },
          covered_period_end: { gte: lastMonthStart },
        },
        _sum: { total_amount: true },
      })
    : { _sum: { total_amount: null } };

  const earned =
    Number(treatmentSum._sum.amount ?? 0) +
    Number(consultationSum._sum.income_amount ?? 0) +
    Number(travelSum._sum.amount ?? 0);
  const paid = Number(paidSum._sum.total_amount ?? 0);
  const outstanding = earned - paid;
  const monthLabel = `${lastMonthStart.toISOString().slice(0, 10)} - ${lastMonthEnd.toISOString().slice(0, 10)}`;

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-200">{r.receivablesLastMonth}</h2>
        <p className="text-xs text-slate-400">
          {r.receivablesRangeLabel}: {monthLabel}
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.earnedAmount}</p>
            <p className="text-slate-100">{`${earned.toFixed(2)} ILS`}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.paidAmount}</p>
            <p className="text-slate-100">{`${paid.toFixed(2)} ILS`}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.outstandingAmount}</p>
            <p className={outstanding > 0 ? "text-amber-300" : "text-emerald-300"}>{`${outstanding.toFixed(2)} ILS`}</p>
          </div>
        </div>
      </section>
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
                {formatJobDisplayLabel(j)}
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
          <input
            name="covered_period_start"
            type="date"
            placeholder={r.coveredStart}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="covered_period_end"
            type="date"
            placeholder={r.coveredEnd}
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
        <h2 className="text-lg font-medium text-slate-200">{r.filters}</h2>
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          method="get"
        >
          <div>
            <label className="block text-xs text-slate-400">{c.job}</label>
            <select
              name="job"
              defaultValue={jobFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatJobDisplayLabel(j)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{r.filterRecipient}</label>
            <select
              name="recipient"
              defaultValue={recipientFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{r.bankLinkAll}</option>
              <option value="client">{r.recipientClient}</option>
              <option value="organization">{r.recipientOrg}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{r.filterBankLink}</label>
            <select
              name="bank"
              defaultValue={bankFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{r.bankLinkAll}</option>
              <option value="linked">{r.bankLinkLinked}</option>
              <option value="unlinked">{r.bankLinkUnlinked}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.from}</label>
            <input
              name="from"
              type="date"
              defaultValue={sp.from ?? ""}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.to}</label>
            <input
              name="to"
              type="date"
              defaultValue={sp.to ?? ""}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600"
          >
            {c.apply}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{r.receiptsCount(receipts.length)}</h2>
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
                  <th className="px-3 py-2 text-slate-300">{r.receivablesRangeLabel}</th>
                  <th className="px-3 py-2 text-slate-300">{r.tableView}</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((rec) => (
                  <tr key={rec.id} className="border-b border-slate-700/80">
                    <td className="px-3 py-2 text-slate-100">{rec.receipt_number}</td>
                    <td className="px-3 py-2 text-slate-400">{String(rec.issued_at)}</td>
                    <td className="px-3 py-2 text-slate-400">{formatJobDisplayLabel(rec.job)}</td>
                    <td className="px-3 py-2 text-slate-200">
                      {formatDecimalAmountForDisplay(obfuscate, rec.total_amount, rec.currency)}
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {rec.covered_period_start && rec.covered_period_end
                        ? `${rec.covered_period_start.toISOString().slice(0, 10)} - ${rec.covered_period_end.toISOString().slice(0, 10)}`
                        : "-"}
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
