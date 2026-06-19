import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicCommon, privateClinicConsultations, privateClinicReceipts } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import {
  createTherapyConsultation,
  deleteTherapyConsultation,
  updateTherapyConsultation,
} from "../actions";
import type { TherapyTransactionOption } from "@/components/therapy-transaction-link-select";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import {
  jobWhereInPrivateClinicModule,
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
} from "@/lib/private-clinic/jobs-scope";
import { defaultClinicJobId } from "@/lib/private-clinic/default-clinic-job-id";
import { formatAmountTotalsByCurrencyForDisplay } from "@/lib/private-clinic/list-amount-totals";
import {
  loadConsultationsCursorPage,
  loadConsultationsAmountTotal,
  parseConsultationsReceivedFilter,
  parseConsultationsSortDir,
  parseConsultationsSortKey,
  type ConsultationsListFilters,
} from "./consultations-list-data";
import { ConsultationsListClient } from "./consultations-list-client";
import { ConsultationModalForm } from "./consultation-modal-form";
import { ConsultationsAddButton } from "./consultations-add-button";
import { PrivateClinicNavSegmentReporter } from "@/components/private-clinic-nav-segment-reporter";
import { HouseholdDateField } from "@/components/household-date-field";
import { PrivateClinicFilterResetButton } from "@/components/private-clinic-filter-reset-button";
import { householdUserOnlyPrivateClinicSection } from "@/lib/household-sections";

const CONSULTATIONS_BASE = "/dashboard/private-clinic/consultations";

/** Prisma row before serializing `amount` to string for `TherapyTransactionOption`. */
type ConsultationModalTxnRow = Omit<TherapyTransactionOption, "amount"> & {
  amount: { toString(): string };
};

export type ConsultationsPageSearchParams = Promise<{
  created?: string;
  updated?: string;
  deleted?: string;
  error?: string;
  job?: string;
  receipt?: string;
  from?: string;
  to?: string;
  received?: string;
  sort?: string;
  dir?: string;
  consultation_type_id?: string;
  modal?: string;
  edit_id?: string;
}>;

export async function ConsultationsPageContent({
  searchParams,
}: {
  searchParams?: ConsultationsPageSearchParams;
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
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const co = privateClinicConsultations(uiLanguage);
  const r = privateClinicReceipts(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const clinicOnly = await householdUserOnlyPrivateClinicSection(
    householdId,
    session.user.id,
    uiLanguage,
  );
  const modalMode = sp.modal === "edit" ? "edit" : sp.modal === "new" ? "new" : null;
  const filters: ConsultationsListFilters = {
    job: sp.job?.trim() || "",
    consultation_type_id: sp.consultation_type_id?.trim() || "",
    receipt: sp.receipt?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    received: parseConsultationsReceivedFilter(sp.received),
    sort: parseConsultationsSortKey(sp.sort),
    dir: parseConsultationsSortDir(sp.dir),
  };

  const listParams = new URLSearchParams();
  if (filters.job) listParams.set("job", filters.job);
  if (filters.consultation_type_id) listParams.set("consultation_type_id", filters.consultation_type_id);
  if (filters.receipt) listParams.set("receipt", filters.receipt);
  if (filters.from) listParams.set("from", filters.from);
  if (filters.to) listParams.set("to", filters.to);
  if (filters.received !== "all") listParams.set("received", filters.received);
  if (filters.sort !== "occurred_at") listParams.set("sort", filters.sort);
  if (filters.dir !== "desc") listParams.set("dir", filters.dir);
  const baseListHref = listParams.size > 0 ? `${CONSULTATIONS_BASE}?${listParams.toString()}` : CONSULTATIONS_BASE;
  const hasConsultationsListFilters =
    Boolean(filters.job) ||
    Boolean(filters.consultation_type_id) ||
    Boolean(filters.receipt) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.received !== "all" ||
    filters.sort !== "occurred_at" ||
    filters.dir !== "desc";

  const apiListParams = new URLSearchParams(listParams);
  apiListParams.set("take", "50");
  const apiHrefBase = `/api/private-clinic/consultations?${apiListParams.toString()}`;

  const [jobs, firstPage, consultationTypes, amountTotalsByCurrency] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    loadConsultationsCursorPage({
      householdId,
      familyMemberId,
      filters,
      take: 50,
    }),
    prisma.therapy_consultation_types.findMany({
      where: { household_id: householdId },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, name_he: true, is_active: true },
    }),
    loadConsultationsAmountTotal({
      householdId,
      familyMemberId,
      filters,
    }),
  ]);

  const activeConsultationTypes = consultationTypes.filter((t) => t.is_active);
  const consultationTypesForPicker = (currentTypeId?: string) => {
    if (!currentTypeId) return activeConsultationTypes;
    const current = consultationTypes.find((t) => t.id === currentTypeId);
    if (current && !current.is_active && !activeConsultationTypes.some((t) => t.id === current.id)) {
      return [...activeConsultationTypes, current];
    }
    return activeConsultationTypes;
  };

  const editId = sp.edit_id?.trim() || "";
  const editConsultation =
    modalMode === "edit" && editId
      ? await prisma.therapy_consultations.findFirst({
          where: { id: editId, household_id: householdId, job: jobScope },
          include: { participants: true },
        })
      : null;

  let modalClients: Array<{ id: string; first_name: string; last_name: string | null; is_active: boolean }> = [];
  let modalPrograms: Array<{ id: string; job_id: string; name: string }> = [];
  let transactionOptions: ConsultationModalTxnRow[] = [];
  if (modalMode === "new" || modalMode === "edit") {
    const [clientsR, programsR, txRows] = await Promise.all([
      prisma.therapy_clients.findMany({
        where: {
          household_id: householdId,
          OR: [{ is_active: true }, { consultation_participations: { some: {} } }],
        },
        orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
        select: { id: true, first_name: true, last_name: true, is_active: true },
      }),
      prisma.therapy_service_programs.findMany({
        where: {
          household_id: householdId,
          OR: [
            {
              job: {
                ...jobWhereInPrivateClinicModule,
                ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
              },
              is_active: true,
            },
            ...(editConsultation?.program_id ? [{ id: editConsultation.program_id }] : []),
          ],
        },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
        select: { id: true, job_id: true, name: true },
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
    modalClients = clientsR;
    modalPrograms = programsR;
    transactionOptions = txRows as ConsultationModalTxnRow[];
  }
  const filteredReceipt = filters.receipt
    ? await prisma.therapy_receipts.findFirst({
        where: { id: filters.receipt, household_id: householdId, job: jobScope },
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
      {(sp.created || sp.updated || sp.deleted) && (
        <p
          className={
            sp.deleted
              ? "rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200"
              : "rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100"
          }
        >
          {sp.deleted ? c.deleted : c.saved}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{co.filters}</h2>
        {filteredReceipt ? (
          <p className="text-sm font-normal text-slate-400">
            {c.filteredByReceipt(filteredReceipt.receipt_number)}{" "}
            <PrivateClinicFilterResetButton
              href={CONSULTATIONS_BASE}
              label={c.filterReset}
              className="inline-flex h-auto min-h-0 items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-normal text-sky-400 hover:text-sky-300 hover:underline disabled:opacity-60"
            />
          </p>
        ) : null}
        <form
          className="flex flex-wrap items-end gap-x-2 gap-y-2 rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:gap-x-3 sm:p-4"
          method="get"
        >
          {filters.receipt ? <input type="hidden" name="receipt" value={filters.receipt} /> : null}
          <div className="min-w-0 max-w-xs grow-0 basis-[11.5rem]">
            <label htmlFor="consultations-filter-job" className="block text-xs text-slate-400">
              {c.job}
            </label>
            <select
              id="consultations-filter-job"
              name="job"
              defaultValue={defaultClinicJobId(jobs, sp.job !== undefined ? filters.job : undefined)}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatJobDisplayLabel(j)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 max-w-xs grow-0 basis-[10.5rem]">
            <label htmlFor="consultations-filter-type" className="block text-xs text-slate-400">
              {c.type}
            </label>
            <select
              id="consultations-filter-type"
              name="consultation_type_id"
              defaultValue={filters.consultation_type_id}
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.any}</option>
              {consultationTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {therapyLocalizedCategoryName(t, uiLanguage)}
                </option>
              ))}
            </select>
          </div>
          <div className="w-[7.5rem] shrink-0">
            <label htmlFor="consultations-filter-received" className="block text-xs text-slate-400">
              {co.filterReceivedPayment}
            </label>
            <select
              id="consultations-filter-received"
              name="received"
              defaultValue={filters.received}
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
            >
              <option value="all">{co.receivedAll}</option>
              <option value="linked">{co.receivedLinked}</option>
              <option value="unlinked">{co.receivedUnlinked}</option>
            </select>
          </div>
          <div className="w-[11.25rem] shrink-0">
            <label className="block text-xs text-slate-400">{c.from}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="from"
                defaultIsoYmd={filters.from}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div className="w-[11.25rem] shrink-0">
            <label className="block text-xs text-slate-400">{c.to}</label>
            <div className="mt-1">
              <HouseholdDateField
                name="to"
                defaultIsoYmd={filters.to}
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-2 text-sm text-slate-100"
              />
            </div>
          </div>
          <div className="flex shrink-0 items-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-normal text-slate-100 hover:bg-slate-600"
            >
              {c.apply}
            </button>
            {hasConsultationsListFilters ? (
              <PrivateClinicFilterResetButton href={CONSULTATIONS_BASE} label={c.filterReset} />
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="shrink-0 text-lg font-medium text-slate-200">{co.consultationsHeading}</h2>
          {firstPage.rows.length > 0 ? (
            <p className="min-w-0 flex-1 text-right text-sm font-medium text-slate-200">
              {c.total}: {formatAmountTotalsByCurrencyForDisplay(obfuscate, amountTotalsByCurrency, uiLanguage)}
            </p>
          ) : (
            <div className="flex-1" />
          )}
          <ConsultationsAddButton href={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=new`} label={co.addTitle} />
        </div>
        {firstPage.rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.noEntriesYet}</p>
        ) : (
          <ConsultationsListClient
            initialRows={firstPage.rows}
            initialCursor={firstPage.nextCursor}
            apiHrefBase={apiHrefBase}
            listBaseHref={baseListHref}
            uiLanguage={uiLanguage}
            dateDisplayFormat={dateDisplayFormat}
            labels={{
              when: c.when,
              type: c.type,
              job: c.job,
              program: c.program,
              clients: co.clients,
              amount: c.amount,
              receipt: co.receipt,
              notes: c.notes,
              edit: c.edit,
              linked: co.receivedLinked,
              unlinked: co.receivedUnlinked,
              loadingMore: co.loadingMore,
              noMoreRows: co.noMoreRows,
              loadMore: co.loadMore,
            }}
            obfuscate={obfuscate}
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
          programs={modalPrograms.map((p) => ({ id: p.id, jobId: p.job_id, label: p.name }))}
          types={consultationTypesForPicker().map((t) => ({ id: t.id, name: t.name, name_he: t.name_he }))}
          clients={modalClients.map((cl) => ({
            id: cl.id,
            label: `${cl.first_name} ${cl.last_name ?? ""}`.trim() + (cl.is_active ? "" : ` (${c.inactive})`),
          }))}
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
            program: r.programOptionalEmpty,
            select: c.select,
            type: c.type,
            dateTime: co.dateTime,
            amountLabel: co.amountLabel,
            linkedTx: co.linkTx,
            clients: co.clients,
            selectClientPlaceholder: co.selectClientPlaceholder,
            addAdditionalClient: co.addAdditionalClient,
            remove: c.remove,
            notes: c.notes,
            txNoneLinked: c.txNoneLinked,
          }}
          clinicOnly={clinicOnly}
        />
      ) : null}
      {modalMode === "edit" && editConsultation ? (
        <ConsultationModalForm
          action={updateTherapyConsultation}
          deleteAction={deleteTherapyConsultation}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`}
          redirectOnDeleteSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}deleted=1`}
          redirectOnError={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}modal=edit&edit_id=${encodeURIComponent(editConsultation.id)}`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          jobs={jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }))}
          programs={modalPrograms.map((p) => ({ id: p.id, jobId: p.job_id, label: p.name }))}
          types={consultationTypesForPicker(editConsultation.consultation_type_id).map((t) => ({
            id: t.id,
            name: t.name,
            name_he: t.name_he,
          }))}
          clients={modalClients.map((cl) => ({
            id: cl.id,
            label: `${cl.first_name} ${cl.last_name ?? ""}`.trim() + (cl.is_active ? "" : ` (${c.inactive})`),
          }))}
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
            program_id: editConsultation.program_id ?? "",
            consultation_type_id: editConsultation.consultation_type_id,
            occurred_at: editConsultation.occurred_at.toISOString().slice(0, 16),
            amount: editConsultation.amount?.toString() ?? editConsultation.income_amount?.toString() ?? "",
            currency: editConsultation.currency ?? editConsultation.income_currency,
            linked_transaction_id:
              editConsultation.linked_transaction_id ??
              editConsultation.linked_income_transaction_id ??
              editConsultation.linked_cost_transaction_id ??
              "",
            participant_ids: editConsultation.participants.map((p) => p.client_id),
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
            program: r.programOptionalEmpty,
            select: c.select,
            type: c.type,
            dateTime: co.dateTime,
            amountLabel: co.amountLabel,
            linkedTx: co.linkTx,
            clients: co.clients,
            selectClientPlaceholder: co.selectClientPlaceholder,
            addAdditionalClient: co.addAdditionalClient,
            remove: c.remove,
            notes: c.notes,
            txNoneLinked: c.txNoneLinked,
          }}
          clinicOnly={clinicOnly}
        />
      ) : null}
      <PrivateClinicNavSegmentReporter path="/dashboard/private-clinic/consultations" />
    </div>
  );
}
