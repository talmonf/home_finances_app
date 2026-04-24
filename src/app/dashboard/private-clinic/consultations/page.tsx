import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { formatHouseholdDateUtcWithTime } from "@/lib/household-date-format";
import { privateClinicCommon, privateClinicConsultations } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import {
  createTherapyConsultation,
  deleteTherapyConsultation,
  updateTherapyConsultation,
} from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWherePrivateClinicScoped, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";

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
    modal?: string;
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
  const modalMode = sp.modal === "new" ? "new" : null;
  const jobFilter = sp.job || "";
  const receiptFilter = sp.receipt || "";
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;
  const incomeBankFilter = sp.income_bank || "all";
  const listParams = new URLSearchParams();
  if (jobFilter) listParams.set("job", jobFilter);
  if (receiptFilter) listParams.set("receipt", receiptFilter);
  if (sp.from) listParams.set("from", sp.from);
  if (sp.to) listParams.set("to", sp.to);
  if (incomeBankFilter && incomeBankFilter !== "all") listParams.set("income_bank", incomeBankFilter);
  const baseListHref = listParams.size > 0 ? `${CONSULTATIONS_BASE}?${listParams.toString()}` : CONSULTATIONS_BASE;

  const [jobs, types, rows] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
    }),
    prisma.therapy_consultations.findMany({
      where: {
        household_id: householdId,
        job: jobScope,
        ...(jobFilter ? { job_id: jobFilter } : {}),
        ...(receiptFilter
          ? {
              receipt_allocations: {
                some: {
                  receipt_id: receiptFilter,
                },
              },
            }
          : {}),
        ...(from || to
          ? {
              occurred_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
        ...(incomeBankFilter === "linked"
          ? { linked_income_transaction_id: { not: null } }
          : {}),
        ...(incomeBankFilter === "unlinked" ? { linked_income_transaction_id: null } : {}),
      },
      orderBy: { occurred_at: "desc" },
      take: 500,
      include: { job: true, consultation_type: true },
    }),
  ]);
  const filteredReceipt = receiptFilter
    ? await prisma.therapy_receipts.findFirst({
        where: { id: receiptFilter, household_id: householdId, job: jobScope },
        select: { id: true, receipt_number: true },
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
          className="grid gap-2.5 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          method="get"
        >
          {receiptFilter ? <input type="hidden" name="receipt" value={receiptFilter} /> : null}
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
            <label className="block text-xs text-slate-400">{co.filterIncomeBank}</label>
            <select
              name="income_bank"
              defaultValue={incomeBankFilter}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 sm:mt-auto"
          >
            {c.apply}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-200">{co.consultationsCount(rows.length)}</h2>
          <Link
            href={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`}
            className="w-full rounded-lg bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-sky-400 sm:w-auto"
          >
            {co.addTitle}
          </Link>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.noEntriesYet}</p>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {rows.map((r) => (
              <details
                key={r.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-4"
              >
                <summary className="cursor-pointer text-sm text-slate-200">
                  {formatHouseholdDateUtcWithTime(r.occurred_at, dateDisplayFormat)} —{" "}
                  {therapyLocalizedCategoryName(r.consultation_type, uiLanguage)} — {formatJobDisplayLabel(r.job)}
                </summary>
                <form action={updateTherapyConsultation} className="mt-2.5 grid gap-2 md:mt-3 md:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select
                    name="job_id"
                    defaultValue={r.job_id}
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
                    name="consultation_type_id"
                    defaultValue={r.consultation_type_id}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {therapyLocalizedCategoryName(t, uiLanguage)}
                      </option>
                    ))}
                  </select>
                  <input
                    name="occurred_at"
                    type="datetime-local"
                    defaultValue={r.occurred_at.toISOString().slice(0, 16)}
                    required
                    className="rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                  />
                  <div className="flex gap-1">
                    <input
                      name="income_amount"
                      defaultValue={r.income_amount?.toString() ?? ""}
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      name="income_currency"
                      defaultValue={r.income_currency}
                      className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-1">
                    <input
                      name="cost_amount"
                      defaultValue={r.cost_amount?.toString() ?? ""}
                      className="flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                    <input
                      name="cost_currency"
                      defaultValue={r.cost_currency}
                      className="w-14 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TherapyTransactionLinkSelect
                      name="linked_income_transaction_id"
                      householdId={householdId}
                      currentId={r.linked_income_transaction_id}
                      label={co.incomeTx}
                      noneOptionLabel={c.txNoneLinked}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <TherapyTransactionLinkSelect
                      name="linked_cost_transaction_id"
                      householdId={householdId}
                      currentId={r.linked_cost_transaction_id}
                      label={co.costTx}
                      noneOptionLabel={c.txNoneLinked}
                    />
                  </div>
                  <textarea
                    name="notes"
                    defaultValue={r.notes ?? ""}
                    className="md:col-span-2 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs"
                  />
                  <button type="submit" className="rounded bg-sky-600 px-2 py-1.5 text-xs text-white">
                    {c.save}
                  </button>
                </form>
                <ConfirmDeleteForm action={deleteTherapyConsultation} className="mt-2">
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="text-xs text-rose-400">
                    {c.delete}
                  </button>
                </ConfirmDeleteForm>
              </details>
            ))}
          </div>
        )}
      </section>

      {modalMode === "new" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-3 py-4 sm:px-4 sm:py-6">
          <div className="w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-slate-100">{co.addTitle}</h3>
              <Link href={baseListHref} className="text-sm text-slate-400 hover:text-slate-200">
                {c.cancel}
              </Link>
            </div>
            <form action={createTherapyConsultation} className="grid gap-3 md:grid-cols-2">
              <input type="hidden" name="redirect_on_success" value={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`} />
              <input type="hidden" name="redirect_on_error" value={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`} />
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
                name="consultation_type_id"
                required
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{c.type}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {therapyLocalizedCategoryName(t, uiLanguage)}
                  </option>
                ))}
              </select>
              <div>
                <label className="block text-xs text-slate-400">{co.dateTime}</label>
                <input
                  name="occurred_at"
                  type="datetime-local"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-400">{co.incomeLabel}</label>
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
                  <label className="block text-xs text-slate-400">{co.costLabel}</label>
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
                  label={co.linkIncome}
                  hint={co.linkIncomeHint}
                  noneOptionLabel={c.txNoneLinked}
                />
              </div>
              <div className="md:col-span-2">
                <TherapyTransactionLinkSelect
                  name="linked_cost_transaction_id"
                  householdId={householdId}
                  label={co.linkCost}
                  hint={co.linkCostHint}
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
                  {c.save}
                </button>
                <Link href={baseListHref} className="text-sm text-slate-400 hover:text-slate-200">
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
