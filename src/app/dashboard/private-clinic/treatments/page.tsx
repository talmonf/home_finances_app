import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTherapyTreatment, deleteTherapyTreatment, updateTherapyTreatment } from "../actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { privateClinicCommon, privateClinicTreatments } from "@/lib/private-clinic-i18n";
import { therapyLocalizedNoteLabel } from "@/lib/therapy-localized-name";
import { TherapyTreatmentAttachments } from "@/components/therapy-treatment-attachments";
import { OpenPrivateClinicTreatmentsImportButton } from "@/components/open-private-clinic-treatments-import";
import {
  formatPrivateClinicJobLabel,
  jobsWhereActiveForPrivateClinicPickers,
  jobWhereInPrivateClinicModule,
} from "@/lib/private-clinic/jobs-scope";
import { defaultOccurredTimeInputValue } from "@/lib/therapy/occurred-at-form";
import { utcDateToHtmlDateInputValue } from "@/lib/household-date-format";
import { TreatmentModalForm } from "./treatment-modal-form";
import { TreatmentsListClient } from "./treatments-list-client";
import {
  loadTreatmentsCursorPage,
  parseTreatmentsPaidFilter,
  parseTreatmentsSortDir,
  parseTreatmentsSortKey,
  type TreatmentsListFilters,
} from "./treatments-list-data";

export const dynamic = "force-dynamic";

type Search = {
  paid?: string;
  job?: string;
  program?: string;
  client?: string;
  receipt?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  modal?: string;
  edit_id?: string;
};

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams?: Promise<Search & { created?: string; updated?: string; error?: string }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = await getCurrentObfuscateSensitive();
  const c = privateClinicCommon(uiLanguage);
  const tr = privateClinicTreatments(uiLanguage);
  const sp = searchParams ? await searchParams : {};
  const filters: TreatmentsListFilters = {
    paid: parseTreatmentsPaidFilter(sp.paid),
    job: sp.job?.trim() || "",
    program: sp.program?.trim() || "",
    client: sp.client?.trim() || "",
    receipt: sp.receipt?.trim() || "",
    from: sp.from?.trim() || "",
    to: sp.to?.trim() || "",
    sort: parseTreatmentsSortKey(sp.sort),
    dir: parseTreatmentsSortDir(sp.dir),
  };

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [linkedJobRows, linkedProgramRows, linkedClientRows] = await Promise.all([
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      distinct: ["job_id"],
      select: { job_id: true },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      distinct: ["program_id"],
      select: { program_id: true },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      distinct: ["client_id"],
      select: { client_id: true },
    }),
  ]);
  const linkedJobIds = linkedJobRows.map((r) => r.job_id);
  const linkedProgramIds = linkedProgramRows
    .map((r) => r.program_id)
    .filter((id): id is string => Boolean(id));
  const linkedClientIds = linkedClientRows.map((r) => r.client_id);

  const [jobs, programs, clients, settings, visitDefaultsRows, bankAccounts, digitalPaymentMethods, firstPage] =
    await Promise.all([
      prisma.jobs.findMany({
      where: {
        household_id: householdId,
        OR: [
          jobsWhereActiveForPrivateClinicPickers({
            householdId,
            familyMemberId,
          }),
          ...(linkedJobIds.length ? [{ id: { in: linkedJobIds } }] : []),
        ],
      },
      orderBy: { start_date: "desc" },
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
          },
          ...(linkedProgramIds.length ? [{ id: { in: linkedProgramIds } }] : []),
        ],
      },
      include: { job: true },
    }),
      prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        OR: [
          { is_active: true },
          ...(filters.client ? [{ id: filters.client }] : []),
          ...(linkedClientIds.length ? [{ id: { in: linkedClientIds } }] : []),
        ],
      },
      orderBy: { first_name: "asc" },
    }),
      prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
      prisma.therapy_visit_type_default_amounts.findMany({
      where: {
        household_id: householdId,
      },
      select: {
        job_id: true,
        program_id: true,
        visit_type: true,
        amount: true,
        currency: true,
      },
    }),
      prisma.bank_accounts.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { account_name: "asc" },
    }),
      prisma.digital_payment_methods.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { name: "asc" },
    }),
      loadTreatmentsCursorPage({ householdId, filters, take: 50 }),
  ]);

  const visitDefaults = visitDefaultsRows.map((r) => ({
    job_id: r.job_id,
    program_id: r.program_id,
    visit_type: r.visit_type,
    amount: r.amount.toString(),
    currency: r.currency,
  }));

  const note1 = therapyLocalizedNoteLabel(
    settings?.note_1_label ?? "Note 1",
    settings?.note_1_label_he,
    uiLanguage,
  );
  const note2 = therapyLocalizedNoteLabel(
    settings?.note_2_label ?? "Note 2",
    settings?.note_2_label_he,
    uiLanguage,
  );
  const note3 = therapyLocalizedNoteLabel(
    settings?.note_3_label ?? "Note 3",
    settings?.note_3_label_he,
    uiLanguage,
  );

  const queryParams = new URLSearchParams();
  if (filters.paid !== "all") queryParams.set("paid", filters.paid);
  if (filters.job) queryParams.set("job", filters.job);
  if (filters.program) queryParams.set("program", filters.program);
  if (filters.client) queryParams.set("client", filters.client);
  if (filters.receipt) queryParams.set("receipt", filters.receipt);
  if (filters.from) queryParams.set("from", filters.from);
  if (filters.to) queryParams.set("to", filters.to);
  if (filters.sort !== "occurred_at") queryParams.set("sort", filters.sort);
  if (filters.dir !== "desc") queryParams.set("dir", filters.dir);
  const baseListHref = `/dashboard/private-clinic/treatments?${queryParams.toString()}`;
  const apiHrefBase = `/api/private-clinic/treatments?${queryParams.toString()}&take=50`;

  const modalMode = sp.modal === "edit" ? "edit" : sp.modal === "new" ? "new" : null;
  const editId = sp.edit_id?.trim() || "";
  const editTreatment =
    modalMode === "edit" && editId
      ? await prisma.therapy_treatments.findFirst({
          where: { id: editId, household_id: householdId },
          include: {
            client: { select: { first_name: true, last_name: true } },
            attachments: { orderBy: { created_at: "asc" } },
            receipt_allocations: {
              orderBy: { created_at: "asc" },
              include: { receipt: { select: { id: true, receipt_number: true } } },
            },
          },
        })
      : null;
  const filteredReceipt = filters.receipt
    ? await prisma.therapy_receipts.findFirst({
        where: { id: filters.receipt, household_id: householdId },
        select: { id: true, receipt_number: true },
      })
    : null;

  return (
    <div className="space-y-8">
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
        <h2 className="text-lg font-medium text-slate-200">{tr.filters}</h2>
        {filteredReceipt ? (
          <p className="text-xs text-slate-400">
            {c.filteredByReceipt(filteredReceipt.receipt_number)}{" "}
            <Link href="/dashboard/private-clinic/treatments" className="text-sky-400 hover:underline">
              {c.cancel}
            </Link>
          </p>
        ) : null}
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          method="get"
        >
          {filters.receipt ? <input type="hidden" name="receipt" value={filters.receipt} /> : null}
          <div>
            <label className="block text-xs text-slate-400">{tr.payment}</label>
            <select
              name="paid"
              defaultValue={filters.paid}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="all">{c.all}</option>
              <option value="paid">{tr.filterPaid}</option>
              <option value="partial">{tr.filterPartial}</option>
              <option value="unpaid">{tr.filterUnpaid}</option>
            </select>
          </div>
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
                  {formatPrivateClinicJobLabel(j)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.program}</label>
            <select
              name="program"
              defaultValue={filters.program}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.anyF}</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPrivateClinicJobLabel(p.job)} — {p.name}
                </option>
              ))}
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
            <label className="block text-xs text-slate-400">{c.from}</label>
            <input
              name="from"
              type="date"
              defaultValue={filters.from}
              className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400">{c.to}</label>
            <input
              name="to"
              type="date"
              defaultValue={filters.to}
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
          <h2 className="text-lg font-medium text-slate-200">{tr.treatmentsTitle}</h2>
          <div className="flex items-center gap-2">
            <OpenPrivateClinicTreatmentsImportButton
              label={tr.importBtn}
              importPath="/dashboard/private-clinic/treatments/import"
            />
            <Link
              href={`${baseListHref}&modal=new`}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {tr.addTreatmentBtn}
            </Link>
          </div>
        </div>
        {firstPage.rows.length === 0 ? (
          <p className="text-sm text-slate-500">{c.noRowsMatch}</p>
        ) : (
          <TreatmentsListClient
            initialRows={firstPage.rows}
            initialCursor={firstPage.nextCursor}
            apiHrefBase={apiHrefBase}
            listBaseHref={baseListHref}
            dateDisplayFormat={dateDisplayFormat}
            uiLanguage={uiLanguage}
            obfuscate={obfuscate}
            labels={{
              when: c.when,
              client: c.client,
              job: c.job,
              program: c.program,
              amount: c.amount,
              paid: c.paid,
              receiptCol: tr.receiptCol,
              paymentDetailsCol: tr.paymentDetailsCol,
              edit: c.edit,
              createReceiptLabel: tr.createReceiptForSelected,
              unlinkLabel: tr.unlinkFromReceipt,
              loadingMore: tr.loadingMore,
              noMoreRows: tr.noMoreRows,
              loadMore: tr.loadMore,
            }}
          />
        )}
      </section>
      {modalMode === "new" ? (
        <TreatmentModalForm
          action={createTherapyTreatment}
          mode="create"
          title={tr.addTreatmentBtn}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}created=1`}
          redirectOnError={`${baseListHref}&modal=new`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          clients={clients.map((cl) => ({
            id: cl.id,
            label: `${cl.first_name} ${cl.last_name ?? ""}`,
            default_job_id: cl.default_job_id,
            default_program_id: cl.default_program_id,
            default_visit_type: cl.default_visit_type,
          }))}
          jobs={jobs.map((j) => ({ id: j.id, label: formatPrivateClinicJobLabel(j) }))}
          programs={programs.map((p) => ({ id: p.id, job_id: p.job_id, label: p.name }))}
          visitDefaults={visitDefaults}
          bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: `${b.account_name} — ${b.bank_name}` }))}
          digitalPaymentMethods={digitalPaymentMethods.map((d) => ({ id: d.id, name: d.name }))}
          labels={{ c, tr, note1, note2, note3 }}
        />
      ) : null}
      {modalMode === "edit" && editTreatment ? (
        <TreatmentModalForm
          action={updateTherapyTreatment}
          mode="edit"
          title={tr.editTreatmentTitle}
          closeHref={baseListHref}
          redirectOnSuccess={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`}
          redirectOnError={`${baseListHref}&modal=edit&edit_id=${encodeURIComponent(editTreatment.id)}`}
          householdId={householdId}
          uiLanguage={uiLanguage}
          clients={clients.map((cl) => ({
            id: cl.id,
            label: `${cl.first_name} ${cl.last_name ?? ""}`,
            default_job_id: cl.default_job_id,
            default_program_id: cl.default_program_id,
            default_visit_type: cl.default_visit_type,
          }))}
          jobs={jobs.map((j) => ({ id: j.id, label: formatPrivateClinicJobLabel(j) }))}
          programs={programs.map((p) => ({ id: p.id, job_id: p.job_id, label: p.name }))}
          visitDefaults={visitDefaults}
          bankAccounts={bankAccounts.map((b) => ({ id: b.id, label: `${b.account_name} — ${b.bank_name}` }))}
          digitalPaymentMethods={digitalPaymentMethods.map((d) => ({ id: d.id, name: d.name }))}
          labels={{ c, tr, note1, note2, note3 }}
          initial={{
            id: editTreatment.id,
            client_id: editTreatment.client_id,
            client_label: `${editTreatment.client.first_name} ${editTreatment.client.last_name ?? ""}`.trim(),
            job_id: editTreatment.job_id,
            program_id: editTreatment.program_id ?? "",
            occurred_date: utcDateToHtmlDateInputValue(editTreatment.occurred_at),
            occurred_time: defaultOccurredTimeInputValue(editTreatment.occurred_at),
            amount: editTreatment.amount.toString(),
            currency: editTreatment.currency,
            visit_type: editTreatment.visit_type,
            linked_transaction_id: editTreatment.linked_transaction_id ?? "",
            payment_date: utcDateToHtmlDateInputValue(editTreatment.payment_date),
            payment_method: editTreatment.payment_method ?? "",
            payment_bank_account_id: editTreatment.payment_bank_account_id ?? "",
            payment_digital_payment_method_id: editTreatment.payment_digital_payment_method_id ?? "",
            note_1: editTreatment.note_1 ?? "",
            note_2: editTreatment.note_2 ?? "",
            note_3: editTreatment.note_3 ?? "",
          }}
          extraContent={
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <ConfirmDeleteForm action={deleteTherapyTreatment}>
                  <input type="hidden" name="id" value={editTreatment.id} />
                  <input type="hidden" name="redirect_on_success" value={`${baseListHref}${baseListHref.includes("?") ? "&" : "?"}updated=1`} />
                  <button type="submit" className="text-sm text-rose-400">
                    {c.delete}
                  </button>
                </ConfirmDeleteForm>
                <p className="text-xs text-slate-500">{tr.receiptLinkedHint}</p>
              </div>
              <ul className="list-none space-y-1 text-xs">
                {editTreatment.receipt_allocations.map((a) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/private-clinic/receipts/${a.receipt.id}`} className="text-sky-400 hover:underline">
                      #{a.receipt.receipt_number}
                    </Link>
                  </li>
                ))}
              </ul>
              <TherapyTreatmentAttachments
                treatmentId={editTreatment.id}
                uiLanguage={uiLanguage}
                attachments={editTreatment.attachments.map((a) => ({
                  id: a.id,
                  file_name: a.file_name,
                  mime_type: a.mime_type,
                  byte_size: a.byte_size,
                  transcription_status: a.transcription_status,
                  transcription_text: a.transcription_text,
                  transcription_error: a.transcription_error,
                  transcription_language: a.transcription_language,
                }))}
              />
            </div>
          }
        />
      ) : null}
    </div>
  );
}
