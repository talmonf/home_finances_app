import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicCommon, privateClinicReceipts } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import { createTherapyReceipt, updateTherapyReceipt } from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import {
  loadReceiptsCursorPage,
  parseReceiptsBankFilter,
  parseReceiptsRecipientFilter,
  parseReceiptsSortDir,
  parseReceiptsSortKey,
  type ReceiptsListFilters,
} from "./receipts-list-data";
import { ReceiptsListClient } from "./receipts-list-client";
import { ReceiptModalForm } from "./receipt-modal-form";

export const dynamic = "force-dynamic";

type ReceiptSearch = {
  job?: string;
  client?: string;
  from?: string;
  to?: string;
  recipient?: string;
  bank?: string;
  sort?: string;
  dir?: string;
  modal?: string;
  edit_id?: string;
  created?: string;
  updated?: string;
  error?: string;
};

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptSearch>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const r = privateClinicReceipts(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const filters: ReceiptsListFilters = {
    job: sp.job?.trim() || "",
    client: sp.client?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    recipient: parseReceiptsRecipientFilter(sp.recipient),
    bank: parseReceiptsBankFilter(sp.bank),
    sort: parseReceiptsSortKey(sp.sort),
    dir: parseReceiptsSortDir(sp.dir),
  };
  const now = new Date();
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, clients, firstPage, orgJobs] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        OR: [{ is_active: true }, ...(filters.client ? [{ id: filters.client }] : [])],
      },
      orderBy: { first_name: "asc" },
      select: { id: true, first_name: true, last_name: true, is_active: true },
    }),
    loadReceiptsCursorPage({
      householdId,
      filters,
      take: 50,
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
  const ilsLabel = uiLanguage === "he" ? 'ש"ח' : "ILS";
  const queryParams = new URLSearchParams();
  if (filters.job) queryParams.set("job", filters.job);
  if (filters.client) queryParams.set("client", filters.client);
  if (filters.from) queryParams.set("from", filters.from);
  if (filters.to) queryParams.set("to", filters.to);
  if (filters.recipient !== "all") queryParams.set("recipient", filters.recipient);
  if (filters.bank !== "all") queryParams.set("bank", filters.bank);
  const baseListHref = `/dashboard/private-clinic/receipts?${queryParams.toString()}`;
  const apiHrefBase = `/api/private-clinic/receipts?${queryParams.toString()}&take=50`;

  const modalMode = sp.modal === "edit" ? "edit" : sp.modal === "new" ? "new" : null;
  const editId = sp.edit_id?.trim() || "";
  const editReceipt =
    modalMode === "edit" && editId
      ? await prisma.therapy_receipts.findFirst({
          where: {
            id: editId,
            household_id: householdId,
            job: jobWhereInPrivateClinicModule,
          },
        })
      : null;

  return (
    <div className="space-y-8">
      {sp.error ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{r.formError}</p>
      ) : null}
      {(sp.created || sp.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}
      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-200">{r.receivablesLastMonth}</h2>
        <p className="text-xs text-slate-400">
          {r.receivablesRangeLabel}: {monthLabel}
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.earnedAmount}</p>
            <p className="text-slate-100">{`${earned.toFixed(2)} ${ilsLabel}`}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.paidAmount}</p>
            <p className="text-slate-100">{`${paid.toFixed(2)} ${ilsLabel}`}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
            <p className="text-slate-400">{r.outstandingAmount}</p>
            <p className={outstanding > 0 ? "text-amber-300" : "text-emerald-300"}>{`${outstanding.toFixed(2)} ${ilsLabel}`}</p>
          </div>
        </div>
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
              defaultValue={filters.job}
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
              defaultValue={filters.recipient}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{r.bankLinkAll}</option>
              <option value="client">{r.recipientClient}</option>
              <option value="organization">{r.recipientOrg}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.client}</label>
            <select
              name="client"
              defaultValue={filters.client}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.first_name} {cl.last_name ?? ""}
                  {!cl.is_active ? ` (${c.inactive})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{r.filterBankLink}</label>
            <select
              name="bank"
              defaultValue={filters.bank}
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{r.receiptsHeading}</h2>
          <Link
            href={`${baseListHref}&modal=new`}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {r.newReceipt}
          </Link>
        </div>
        {firstPage.rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.receiptsEmpty}</p>
        ) : (
          <ReceiptsListClient
            initialRows={firstPage.rows}
            initialCursor={firstPage.nextCursor}
            apiHrefBase={apiHrefBase}
            listBaseHref={baseListHref}
            uiLanguage={uiLanguage}
            obfuscate={obfuscate}
            dateDisplayFormat={dateDisplayFormat}
            labels={{
              number: r.tableNumber,
              date: r.tableDate,
              client: c.client,
              job: r.tableJob,
              amount: r.tableAmount,
              coverage: r.receivablesRangeLabel,
              treatments: r.tableTreatmentsCount,
              edit: c.edit,
              loadingMore: r.loadingMore,
              noMoreRows: r.noMoreRows,
              loadMore: r.loadMore,
            }}
          />
        )}
      </section>
      {modalMode === "new" ? (
        <ReceiptModalForm
          action={createTherapyReceipt}
          mode="create"
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`}
          redirectOnError={`${baseListHref}&modal=new`}
          householdId={householdId}
          jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
          labels={{
            titleNew: r.newReceipt,
            titleEdit: r.editReceipt,
            save: r.createAllocate,
            cancel: c.cancel,
            job: c.job,
            receiptNumber: r.receiptNumber,
            date: c.date,
            totalAmount: r.totalAmount,
            currency: c.currency,
            coveredStart: r.coveredStart,
            coveredEnd: r.coveredEnd,
            recipient: r.filterRecipient,
            paymentMethod: r.paymentMethodLabel,
            notes: c.notes,
            recipientClient: r.recipientClient,
            recipientOrg: r.recipientOrg,
            paymentCash: r.paymentCash,
            paymentBank: r.paymentBank,
            paymentDigital: r.paymentDigital,
            paymentCredit: r.paymentCredit,
            linkBankOptional: c.linkBankOptional,
            linkTxPayment: r.linkTxPayment,
            linkTxPaymentHint: r.linkTxPaymentHint,
            txNoneLinked: c.txNoneLinked,
          }}
        />
      ) : null}
      {modalMode === "edit" && editReceipt ? (
        <ReceiptModalForm
          action={updateTherapyReceipt}
          mode="edit"
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`}
          redirectOnError={`${baseListHref}&modal=edit&edit_id=${encodeURIComponent(editReceipt.id)}`}
          householdId={householdId}
          jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
          labels={{
            titleNew: r.newReceipt,
            titleEdit: r.editReceipt,
            save: r.saveReceipt,
            cancel: c.cancel,
            job: c.job,
            receiptNumber: r.receiptNumber,
            date: c.date,
            totalAmount: r.totalAmount,
            currency: c.currency,
            coveredStart: r.coveredStart,
            coveredEnd: r.coveredEnd,
            recipient: r.filterRecipient,
            paymentMethod: r.paymentMethodLabel,
            notes: c.notes,
            recipientClient: r.recipientClient,
            recipientOrg: r.recipientOrg,
            paymentCash: r.paymentCash,
            paymentBank: r.paymentBank,
            paymentDigital: r.paymentDigital,
            paymentCredit: r.paymentCredit,
            linkBankOptional: c.linkBankOptional,
            linkTxPayment: r.linkTxPayment,
            linkTxPaymentHint: r.linkTxPaymentHint,
            txNoneLinked: c.txNoneLinked,
          }}
          initial={{
            id: editReceipt.id,
            job_id: editReceipt.job_id,
            receipt_number: editReceipt.receipt_number,
            issued_at: editReceipt.issued_at.toISOString().slice(0, 10),
            total_amount: editReceipt.total_amount.toString(),
            currency: editReceipt.currency,
            covered_period_start: editReceipt.covered_period_start?.toISOString().slice(0, 10) ?? "",
            covered_period_end: editReceipt.covered_period_end?.toISOString().slice(0, 10) ?? "",
            recipient_type: editReceipt.recipient_type,
            payment_method: editReceipt.payment_method,
            linked_transaction_id: editReceipt.linked_transaction_id ?? "",
            notes: editReceipt.notes ?? "",
          }}
        />
      ) : null}
    </div>
  );
}
