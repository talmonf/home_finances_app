import Link from "next/link";
import { OpenPrivateClinicTreatmentsImportButton } from "@/components/open-private-clinic-treatments-import";
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
import {
  createTherapyReceipt,
  updateTherapyReceipt,
  linkTreatmentsToReceipt,
  deleteReceiptAllocation,
} from "../actions";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWhereInPrivateClinicModule,
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
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
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

type ReceiptProgramForModal = Prisma.therapy_service_programsGetPayload<{ include: { job: true } }>;

type ReceiptModalClientOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  jobIds: string[];
};

function clientOptionJobIds(row: {
  default_job_id: string;
  client_jobs: { job_id: string }[];
}): string[] {
  const s = new Set<string>();
  s.add(row.default_job_id);
  for (const cj of row.client_jobs) s.add(cj.job_id);
  return [...s];
}

type ReceiptSearch = {
  job?: string;
  client?: string;
  family?: string;
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
    family: sp.family?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    recipient: parseReceiptsRecipientFilter(sp.recipient),
    bank: parseReceiptsBankFilter(sp.bank),
    sort: parseReceiptsSortKey(sp.sort),
    dir: parseReceiptsSortDir(sp.dir),
  };
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [jobs, clients, firstPage, settings, families] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
        OR: [{ is_active: true }, ...(filters.client ? [{ id: filters.client }] : [])],
      },
      orderBy: { first_name: "asc" },
      select: { id: true, first_name: true, last_name: true, is_active: true },
    }),
    loadReceiptsCursorPage({
      householdId,
      familyMemberId,
      filters,
      take: 50,
    }),
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { family_therapy_enabled: true },
    }),
    prisma.therapy_families.findMany({
      where: { household_id: householdId },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
  ]);
  const queryParams = new URLSearchParams();
  if (filters.job) queryParams.set("job", filters.job);
  if (filters.client) queryParams.set("client", filters.client);
  if (filters.family) queryParams.set("family", filters.family);
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
            job: jobWherePrivateClinicScoped(familyMemberId),
          },
          include: {
            _count: {
              select: {
                allocations: true,
                consultation_allocations: true,
                travel_allocations: true,
              },
            },
          },
        })
      : null;

  const emptyReceiptPrograms: ReceiptProgramForModal[] = [];
  let receiptPrograms: ReceiptProgramForModal[] = emptyReceiptPrograms;
  let receiptModalClients: ReceiptModalClientOption[] = [];
  if (modalMode === "new" || modalMode === "edit") {
    const [programs, clientRows] = await Promise.all([
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
            ...(editReceipt?.program_id ? [{ id: editReceipt.program_id }] : []),
          ],
        },
        include: { job: true },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      }),
      prisma.therapy_clients.findMany({
        where: {
          household_id: householdId,
          ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
          OR: [{ is_active: true }, ...(editReceipt?.client_id ? [{ id: editReceipt.client_id }] : [])],
        },
        orderBy: { first_name: "asc" },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          default_job_id: true,
          client_jobs: { select: { job_id: true } },
        },
      }),
    ]);
    receiptPrograms = programs;
    receiptModalClients = clientRows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      jobIds: clientOptionJobIds(row),
    }));
  }

  const orgCoverageRangeWhere =
    editReceipt &&
    editReceipt.recipient_type === "organization" &&
    editReceipt.covered_period_start &&
    editReceipt.covered_period_end
      ? {
          occurred_at: {
            gte: editReceipt.covered_period_start,
            lte: endOfUtcDay(editReceipt.covered_period_end),
          },
        }
      : {};

  const [treatmentsLinkedToReceipt, treatmentsAvailableToLink] = editReceipt
    ? await Promise.all([
        prisma.therapy_treatments.findMany({
          where: {
            household_id: householdId,
            job_id: editReceipt.job_id,
            receipt_allocations: { some: { receipt_id: editReceipt.id } },
          },
          select: {
            id: true,
            occurred_at: true,
            amount: true,
            currency: true,
            client: { select: { first_name: true, last_name: true } },
          },
          orderBy: { occurred_at: "desc" },
          take: 200,
        }),
        prisma.therapy_treatments.findMany({
          where: {
            household_id: householdId,
            job_id: editReceipt.job_id,
            receipt_allocations: { none: {} },
            ...orgCoverageRangeWhere,
          },
          select: {
            id: true,
            occurred_at: true,
            amount: true,
            currency: true,
            client: { select: { first_name: true, last_name: true } },
          },
          orderBy: { occurred_at: "desc" },
          take: 200,
        }),
      ])
    : [[], []];

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
          {settings?.family_therapy_enabled ? (
            <div>
              <label className="block text-xs text-slate-400">Family</label>
              <select
                name="family"
                defaultValue={filters.family}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{c.any}</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
          <div className="flex items-center gap-2">
            <OpenPrivateClinicTreatmentsImportButton
              label={r.importBtn}
              importPath="/dashboard/private-clinic/receipts/import"
            />
            <Link
              href={`${baseListHref}&modal=new`}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {r.newReceipt}
            </Link>
          </div>
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
              family: "Family",
              job: r.tableJob,
              amount: r.tableAmount,
              coverage: r.receivablesRangeLabel,
              treatments: r.tableTreatmentsCount,
              edit: c.edit,
              loadingMore: r.loadingMore,
              noMoreRows: r.noMoreRows,
              loadMore: r.loadMore,
              recipientOrg: r.recipientOrg,
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
          programs={receiptPrograms.map((p) => ({
            id: p.id,
            jobId: p.job_id,
            label: p.name,
          }))}
          clients={receiptModalClients.map((cl) => ({
            id: cl.id,
            first_name: cl.first_name,
            last_name: cl.last_name,
            jobIds: cl.jobIds,
          }))}
          labels={{
            titleNew: r.newReceipt,
            titleEdit: r.editReceipt,
            save: r.createAllocate,
            cancel: c.cancel,
            job: c.job,
            program: c.program,
            programOptionalEmpty: r.programOptionalEmpty,
            client: c.client,
            selectClient: r.selectClient,
            receiptNumber: r.receiptNumber,
            date: c.date,
            totalAmount: r.totalAmount,
            currency: c.currency,
            coveredStart: r.coveredStart,
            coveredEnd: r.coveredEnd,
            recipient: r.filterRecipient,
            selectRecipient: r.selectRecipient,
            paymentMethod: r.paymentMethodLabel,
            selectPaymentMethod: r.selectPaymentMethod,
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
          programs={receiptPrograms.map((p) => ({
            id: p.id,
            jobId: p.job_id,
            label: p.name,
          }))}
          clients={receiptModalClients.map((cl) => ({
            id: cl.id,
            first_name: cl.first_name,
            last_name: cl.last_name,
            jobIds: cl.jobIds,
          }))}
          labels={{
            titleNew: r.newReceipt,
            titleEdit: r.editReceipt,
            save: r.saveReceipt,
            cancel: c.cancel,
            job: c.job,
            program: c.program,
            programOptionalEmpty: r.programOptionalEmpty,
            client: c.client,
            selectClient: r.selectClient,
            receiptNumber: r.receiptNumber,
            date: c.date,
            totalAmount: r.totalAmount,
            currency: c.currency,
            coveredStart: r.coveredStart,
            coveredEnd: r.coveredEnd,
            recipient: r.filterRecipient,
            selectRecipient: r.selectRecipient,
            paymentMethod: r.paymentMethodLabel,
            selectPaymentMethod: r.selectPaymentMethod,
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
            program_id: editReceipt.program_id ?? "",
            client_id: editReceipt.client_id ?? "",
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
          extraContent={
            <div className="space-y-3 rounded border border-slate-700 bg-slate-950/50 p-3 text-xs text-slate-300">
              <div>
                <p className="font-medium text-slate-200">{r.tableTreatmentsCount}</p>
                <p>
                  T: {editReceipt._count.allocations} | C: {editReceipt._count.consultation_allocations} | TR:{" "}
                  {editReceipt._count.travel_allocations}
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-slate-200">{c.treatmentsWord}</p>
                {treatmentsLinkedToReceipt.length > 0 ? (
                  <div className="space-y-1">
                    {treatmentsLinkedToReceipt.map((t) => (
                        <form key={t.id} action={deleteReceiptAllocation} className="flex items-center justify-between gap-3 rounded border border-slate-700/80 px-2 py-1">
                          <input type="hidden" name="receipt_id" value={editReceipt.id} />
                          <input type="hidden" name="treatment_id" value={t.id} />
                          <span>
                            {t.client.first_name} {t.client.last_name ?? ""} | {t.occurred_at.toISOString().slice(0, 10)} |{" "}
                            {t.amount.toString()} {t.currency}
                          </span>
                          <button type="submit" className="text-rose-400 hover:underline">
                            {r.unlinkFromReceipt}
                          </button>
                        </form>
                      ))}
                  </div>
                ) : (
                  <p className="text-slate-500">{c.noEntriesYet}</p>
                )}
              </div>
              <form action={linkTreatmentsToReceipt} className="space-y-2">
                <input type="hidden" name="receipt_id" value={editReceipt.id} />
                <p className="text-slate-200">{r.linkTreatmentsHeading}</p>
                <div className="max-h-52 space-y-1 overflow-auto rounded border border-slate-700 p-2">
                  {treatmentsAvailableToLink.map((t) => (
                    <label key={t.id} className="flex items-center gap-2">
                      <input type="checkbox" name="treatment_ids" value={t.id} />
                      <span>
                        {t.client.first_name} {t.client.last_name ?? ""} | {t.occurred_at.toISOString().slice(0, 10)} |{" "}
                        {t.amount.toString()} {t.currency}
                      </span>
                    </label>
                    ))}
                </div>
                <button type="submit" className="rounded bg-sky-500 px-2 py-1 text-xs font-semibold text-slate-950">
                  {r.linkTreatmentsSubmit}
                </button>
              </form>
            </div>
          }
        />
      ) : null}
    </div>
  );
}
