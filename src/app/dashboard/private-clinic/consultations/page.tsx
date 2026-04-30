import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { privateClinicCommon, privateClinicConsultations } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import {
  createTherapyConsultation,
  deleteTherapyConsultation,
  updateTherapyConsultation,
} from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import {
  loadConsultationsRows,
  parseConsultationsIncomeBankFilter,
  parseConsultationsSortDir,
  parseConsultationsSortKey,
  type ConsultationsListFilters,
} from "./consultations-list-data";
import { ConsultationsListClient } from "./consultations-list-client";
import { ConsultationModalForm } from "./consultation-modal-form";
import { ConsultationsAddButton } from "./consultations-add-button";

export const dynamic = "force-dynamic";
const CONSULTATIONS_BASE = "/dashboard/private-clinic/consultations";

export default async function ConsultationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    job?: string;
    receipt?: string;
    from?: string;
    to?: string;
    income_bank?: string;
    sort?: string;
    dir?: string;
    modal?: string;
    edit_id?: string;
  }>;
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

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const co = privateClinicConsultations(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const modalMode = sp.modal === "edit" ? "edit" : sp.modal === "new" ? "new" : null;
  const filters: ConsultationsListFilters = {
    job: sp.job?.trim() || "",
    receipt: sp.receipt?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    incomeBank: parseConsultationsIncomeBankFilter(sp.income_bank),
    sort: parseConsultationsSortKey(sp.sort),
    dir: parseConsultationsSortDir(sp.dir),
  };

  const listParams = new URLSearchParams();
  if (filters.job) listParams.set("job", filters.job);
  if (filters.receipt) listParams.set("receipt", filters.receipt);
  if (filters.from) listParams.set("from", filters.from);
  if (filters.to) listParams.set("to", filters.to);
  if (filters.incomeBank !== "all") listParams.set("income_bank", filters.incomeBank);
  if (filters.sort !== "occurred_at") listParams.set("sort", filters.sort);
  if (filters.dir !== "desc") listParams.set("dir", filters.dir);
  const baseListHref = listParams.size > 0 ? `${CONSULTATIONS_BASE}?${listParams.toString()}` : CONSULTATIONS_BASE;

  const [jobs, types, rows, transactionOptions] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    loadConsultationsRows({
      householdId,
      familyMemberId,
      filters,
      take: 150,
    }),
    prisma.transactions.findMany({
      where: { household_id: householdId },
      orderBy: { transaction_date: "desc" },
      take: 200,
      select: {
        id: true,
        transaction_date: true,
        amount: true,
        description: true,
        transaction_direction: true,
      },
    }),
  ]);
  const filteredReceipt = filters.receipt
    ? await prisma.therapy_receipts.findFirst({
        where: { id: filters.receipt, household_id: householdId, job: jobScope },
        select: { id: true, receipt_number: true },
      })
    : null;
  const editId = sp.edit_id?.trim() || "";
  const editConsultation =
    modalMode === "edit" && editId
      ? await prisma.therapy_consultations.findFirst({
          where: { id: editId, household_id: householdId, job: jobScope },
        })
      : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <p className="text-sm text-slate-500">{co.intro}</p>
      {sp.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}
      {(sp.created || sp.updated) && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {c.saved}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{co.filters}</h2>
        {filteredReceipt ? (
          <p className="text-xs text-slate-400">
            {c.filteredByReceipt(filteredReceipt.receipt_number)}{" "}
            <a href="/dashboard/private-clinic/consultations" className="text-sky-400 hover:underline">
              {c.cancel}
            </a>
          </p>
        ) : null}
        <form
          className="grid gap-2.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-5"
          method="get"
        >
          {filters.receipt ? <input type="hidden" name="receipt" value={filters.receipt} /> : null}
          <div>
            <label htmlFor="consultations-filter-job" className="block text-xs text-slate-400">
              {c.job}
            </label>
            <select
              id="consultations-filter-job"
              name="job"
              defaultValue={filters.job}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
            <label htmlFor="consultations-filter-income-bank" className="block text-xs text-slate-400">
              {co.filterIncomeBank}
            </label>
            <select
              id="consultations-filter-income-bank"
              name="income_bank"
              defaultValue={filters.incomeBank}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{co.incomeBankAll}</option>
              <option value="linked">{co.incomeBankLinked}</option>
              <option value="unlinked">{co.incomeBankUnlinked}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.from}</label>
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.to}</label>
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:mt-auto"
          >
            {c.apply}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{co.consultationsCount(rows.length)}</h2>
          <ConsultationsAddButton href={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`} label={co.addTitle} />
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.noEntriesYet}</p>
        ) : (
          <ConsultationsListClient
            rows={rows}
            listBaseHref={baseListHref}
            uiLanguage={uiLanguage}
            dateDisplayFormat={dateDisplayFormat}
            labels={{
              when: c.when,
              type: c.type,
              job: c.job,
              income: co.incomeLabel,
              cost: co.costLabel,
              linkedIncome: co.incomeTx,
              linkedCost: co.costTx,
              edit: c.edit,
              linked: co.incomeBankLinked,
              unlinked: co.incomeBankUnlinked,
            }}
          />
        )}
      </section>

      {modalMode === "new" ? (
        <ConsultationModalForm
          action={createTherapyConsultation}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`}
          redirectOnError={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
          types={types.map((t) => ({ id: t.id, name: t.name, name_he: t.name_he }))}
          transactionOptions={transactionOptions.map((t) => ({
            id: t.id,
            transaction_date: t.transaction_date,
            amount: t.amount.toString(),
            description: t.description,
            transaction_direction: t.transaction_direction,
          }))}
          labels={{
            title: co.addTitle,
            cancel: c.cancel,
            save: c.save,
            saving: uiLanguage === "he" ? "שומר..." : "Saving...",
            deleting: uiLanguage === "he" ? "מוחק..." : "Deleting...",
            delete: c.delete,
            job: c.job,
            type: c.type,
            dateTime: co.dateTime,
            incomeLabel: co.incomeLabel,
            costLabel: co.costLabel,
            incomeTx: co.linkIncome,
            costTx: co.linkCost,
            notes: c.notes,
            txNoneLinked: c.txNoneLinked,
          }}
        />
      ) : null}
      {modalMode === "edit" && editConsultation ? (
        <ConsultationModalForm
          action={updateTherapyConsultation}
          deleteAction={deleteTherapyConsultation}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`}
          redirectOnError={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=edit&edit_id=${encodeURIComponent(editConsultation.id)}`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
          types={types.map((t) => ({ id: t.id, name: t.name, name_he: t.name_he }))}
          transactionOptions={transactionOptions.map((t) => ({
            id: t.id,
            transaction_date: t.transaction_date,
            amount: t.amount.toString(),
            description: t.description,
            transaction_direction: t.transaction_direction,
          }))}
          initial={{
            id: editConsultation.id,
            job_id: editConsultation.job_id,
            consultation_type_id: editConsultation.consultation_type_id,
            occurred_at: editConsultation.occurred_at.toISOString().slice(0, 16),
            income_amount: editConsultation.income_amount?.toString() ?? "",
            income_currency: editConsultation.income_currency,
            cost_amount: editConsultation.cost_amount?.toString() ?? "",
            cost_currency: editConsultation.cost_currency,
            linked_income_transaction_id: editConsultation.linked_income_transaction_id ?? "",
            linked_cost_transaction_id: editConsultation.linked_cost_transaction_id ?? "",
            notes: editConsultation.notes ?? "",
          }}
          labels={{
            title: c.edit,
            cancel: c.cancel,
            save: c.save,
            saving: uiLanguage === "he" ? "שומר..." : "Saving...",
            deleting: uiLanguage === "he" ? "מוחק..." : "Deleting...",
            delete: c.delete,
            job: c.job,
            type: c.type,
            dateTime: co.dateTime,
            incomeLabel: co.incomeLabel,
            costLabel: co.costLabel,
            incomeTx: co.linkIncome,
            costTx: co.linkCost,
            notes: c.notes,
            txNoneLinked: c.txNoneLinked,
          }}
        />
      ) : null}
    </div>
  );
}
