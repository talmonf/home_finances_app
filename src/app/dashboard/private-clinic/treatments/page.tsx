import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentObfuscateSensitive,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatClientNameForDisplay, formatDecimalAmountForDisplay } from "@/lib/privacy-display";
import {
  formatHouseholdDate,
  formatHouseholdDateUtcWithOptionalTime,
  utcDateToHtmlDateInputValue,
} from "@/lib/household-date-format";
import { defaultOccurredTimeInputValue } from "@/lib/therapy/occurred-at-form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createTherapyTreatment, deleteTherapyTreatment, updateTherapyTreatment } from "../actions";
import { TherapyTreatmentDefaultAmountFields } from "@/components/therapy-treatment-default-amount-fields";
import { decimalToNumber, treatmentPaymentStatus } from "@/lib/therapy/payment";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { privateClinicCommon, privateClinicTreatments, treatmentPaymentStatusLabel } from "@/lib/private-clinic-i18n";
import { therapyLocalizedNoteLabel } from "@/lib/therapy-localized-name";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { TherapyTreatmentAttachments } from "@/components/therapy-treatment-attachments";
import { OpenPrivateClinicTreatmentsImportButton } from "@/components/open-private-clinic-treatments-import";
import {
  jobWhereInPrivateClinicModule,
  jobsWhereActiveForPrivateClinicPickers,
  formatPrivateClinicJobLabel,
} from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

type Search = {
  paid?: string;
  job?: string;
  program?: string;
  client?: string;
  from?: string;
  to?: string;
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
  const paidFilter = sp.paid || "all";
  const jobFilter = sp.job || "";
  const programFilter = sp.program || "";
  const clientFilter = sp.client || "";
  const from = sp.from ? new Date(sp.from) : null;
  const to = sp.to ? new Date(sp.to) : null;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [linkedJobRows, linkedProgramRows] = await Promise.all([
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
  ]);
  const linkedJobIds = linkedJobRows.map((r) => r.job_id);
  const linkedProgramIds = linkedProgramRows
    .map((r) => r.program_id)
    .filter((id): id is string => id != null);

  const [jobs, programs, clients, settings, allocGroups, treatments, visitDefaultsRows, bankAccounts, digitalPaymentMethods] =
    await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
        includeJobIds: linkedJobIds,
      }),
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
        OR: [{ is_active: true }, ...(clientFilter ? [{ id: clientFilter }] : [])],
      },
      orderBy: { first_name: "asc" },
    }),
    prisma.therapy_settings.findUnique({ where: { household_id: householdId } }),
    prisma.therapy_receipt_allocations.groupBy({
      by: ["treatment_id"],
      where: {
        household_id: householdId,
        treatment: { job: jobWhereInPrivateClinicModule },
      },
      _sum: { amount: true },
    }),
    prisma.therapy_treatments.findMany({
      where: {
        household_id: householdId,
        job: jobWhereInPrivateClinicModule,
        ...(jobFilter ? { job_id: jobFilter } : {}),
        ...(programFilter ? { program_id: programFilter } : {}),
        ...(clientFilter ? { client_id: clientFilter } : {}),
        ...(from || to
          ? {
              occurred_at: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurred_at: "desc" },
      include: {
        client: true,
        job: true,
        program: true,
        attachments: { orderBy: { created_at: "asc" } },
        payment_bank_account: { select: { account_name: true, bank_name: true } },
        payment_digital_payment_method: { select: { name: true } },
        receipt_allocations: {
          orderBy: { created_at: "asc" },
          include: {
            receipt: { select: { id: true, receipt_number: true } },
          },
        },
      },
      take: 500,
    }),
    prisma.therapy_visit_type_default_amounts.findMany({
      where: {
        household_id: householdId,
        job: {
          ...jobWhereInPrivateClinicModule,
          ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
        },
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
  ]);

  const visitDefaults = visitDefaultsRows.map((r) => ({
    job_id: r.job_id,
    program_id: r.program_id,
    visit_type: r.visit_type,
    amount: r.amount.toString(),
    currency: r.currency,
  }));

  const sumMap = new Map(
    allocGroups.map((g) => [g.treatment_id, decimalToNumber(g._sum.amount)]),
  );

  const filtered = treatments.filter((t) => {
    const allocated = sumMap.get(t.id) ?? 0;
    const st = treatmentPaymentStatus(t.amount, allocated);
    if (paidFilter === "all") return true;
    if (paidFilter === "paid") return st === "paid";
    if (paidFilter === "unpaid") return st === "unpaid";
    if (paidFilter === "partial") return st === "partial";
    return true;
  });

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

  const visitOptions = ["clinic", "home", "phone", "video"] as const;

  return (
    <div className="space-y-8">
      {sp.error && (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {sp.error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">{tr.filters}</h2>
        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          method="get"
        >
          <div>
            <label className="block text-xs text-slate-400">{tr.payment}</label>
            <select
              name="paid"
              defaultValue={paidFilter}
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
              defaultValue={jobFilter}
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
              defaultValue={programFilter}
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
              defaultValue={clientFilter}
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
          <h2 className="text-lg font-medium text-slate-200">{tr.logTreatment}</h2>
          <OpenPrivateClinicTreatmentsImportButton
            label={tr.importBtn}
            importPath="/dashboard/private-clinic/treatments/import"
          />
        </div>
        <form
          action={createTherapyTreatment}
          className="grid gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4 md:grid-cols-2"
        >
          <div>
            <label className="block text-xs text-slate-400">{c.client}</label>
            <select
              name="client_id"
              required
              className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.select}</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.first_name} {cl.last_name ?? ""}
                </option>
              ))}
            </select>
          </div>
          <TherapyTreatmentDefaultAmountFields
            uiLanguage={uiLanguage}
            jobs={jobs.map((j) => ({ id: j.id, job_title: formatPrivateClinicJobLabel(j) }))}
            programs={programs.map((p) => ({
              id: p.id,
              job_id: p.job_id,
              name: p.name,
              job: { job_title: formatPrivateClinicJobLabel(p.job) },
            }))}
            visitDefaults={visitDefaults}
            labels={{
              job: c.job,
              program: c.program,
              date: c.date,
              timeOptional: tr.occurredTimeOptional,
              amount: c.amount,
              currency: c.currency,
              visitType: tr.visitType,
              select: c.select,
            }}
          />
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400">{c.linkBankOptional}</label>
            <TherapyTransactionLinkSelect
              name="linked_transaction_id"
              householdId={householdId}
              label={tr.clinicIncomeLink}
              hint={tr.clinicIncomeHint}
              noneOptionLabel={c.txNoneLinked}
            />
          </div>
          <div className="md:col-span-2 space-y-2 rounded-lg border border-slate-700/80 bg-slate-800/40 p-3">
            <p className="text-xs text-slate-500">{tr.paymentFieldsHint}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">{tr.paymentDate}</label>
                <input
                  name="payment_date"
                  type="date"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400">{tr.paymentMethod}</label>
                <select
                  name="payment_method"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">{tr.paymentMethodUnset}</option>
                  <option value="bank_transfer">{tr.paymentBankTransfer}</option>
                  <option value="digital_payment">{tr.paymentDigital}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">{tr.paymentIntoAccount}</label>
                <select
                  name="payment_bank_account_id"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">—</option>
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.account_name} — {b.bank_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400">{tr.paymentDigitalApp}</label>
                <select
                  name="payment_digital_payment_method_id"
                  className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">—</option>
                  {digitalPaymentMethods.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <textarea
            name="note_1"
            placeholder={note1}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_2"
            placeholder={note2}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <textarea
            name="note_3"
            placeholder={note3}
            className="md:col-span-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            {tr.saveTreatment}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-slate-200">
          {tr.treatmentsCount(filtered.length)}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500">{c.noRowsMatch}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="px-3 py-2 text-slate-300">{c.when}</th>
                  <th className="px-3 py-2 text-slate-300">{c.client}</th>
                  <th className="px-3 py-2 text-slate-300">{c.job}</th>
                  <th className="px-3 py-2 text-slate-300">{c.amount}</th>
                  <th className="px-3 py-2 text-slate-300">{c.paid}</th>
                  <th className="px-3 py-2 text-slate-300">{tr.receiptCol}</th>
                  <th className="px-3 py-2 text-slate-300">{tr.paymentDetailsCol}</th>
                  <th className="px-3 py-2 text-slate-300">{c.edit}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const allocated = sumMap.get(t.id) ?? 0;
                  const st = treatmentPaymentStatus(t.amount, allocated);
                  return (
                    <tr key={t.id} className="border-b border-slate-700/80">
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                        {formatHouseholdDateUtcWithOptionalTime(t.occurred_at, dateDisplayFormat)}
                      </td>
                      <td className="px-3 py-2 text-slate-100">
                        {formatClientNameForDisplay(obfuscate, t.client.first_name, t.client.last_name)}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{formatPrivateClinicJobLabel(t.job)}</td>
                      <td className="px-3 py-2 text-slate-200">
                        {formatDecimalAmountForDisplay(obfuscate, t.amount, t.currency)}
                      </td>
                      <td className="px-3 py-2 text-slate-400">{treatmentPaymentStatusLabel(uiLanguage, st)}</td>
                      <td className="max-w-[12rem] px-3 py-2 text-slate-400">
                        {t.receipt_allocations.length > 0 ? (
                          <ul className="list-none space-y-1">
                            {t.receipt_allocations.map((a) => (
                              <li key={a.id}>
                                <Link
                                  href={`/dashboard/private-clinic/receipts/${a.receipt.id}`}
                                  className="text-sky-400 hover:underline"
                                >
                                  #{a.receipt.receipt_number}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-slate-400">
                        {(() => {
                          const parts: string[] = [];
                          if (t.payment_date && !Number.isNaN(t.payment_date.getTime())) {
                            parts.push(formatHouseholdDate(t.payment_date, dateDisplayFormat));
                          }
                          if (t.payment_method === "bank_transfer") {
                            parts.push(tr.paymentBankTransfer);
                            if (t.payment_bank_account) {
                              parts.push(
                                `${t.payment_bank_account.account_name} (${t.payment_bank_account.bank_name})`,
                              );
                            }
                          } else if (t.payment_method === "digital_payment") {
                            parts.push(tr.paymentDigital);
                            if (t.payment_digital_payment_method) {
                              parts.push(t.payment_digital_payment_method.name);
                            }
                          }
                          return parts.length ? parts.join(" · ") : "—";
                        })()}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <details>
                          <summary className="cursor-pointer text-xs text-sky-400">{c.edit}</summary>
                          <form action={updateTherapyTreatment} className="mt-2 space-y-2 rounded border border-slate-700 p-2">
                            <input type="hidden" name="id" value={t.id} />
                            <select
                              name="job_id"
                              defaultValue={t.job_id}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              {jobs.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {formatPrivateClinicJobLabel(j)}
                                </option>
                              ))}
                            </select>
                            <select
                              name="program_id"
                              defaultValue={t.program_id ?? ""}
                              required={programs.some((p) => p.job_id === t.job_id)}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              {programs.some((p) => p.job_id === t.job_id) ? (
                                <>
                                  {!t.program_id ? (
                                    <option value="">{c.select}</option>
                                  ) : null}
                                  {programs
                                    .filter((p) => p.job_id === t.job_id)
                                    .map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {formatPrivateClinicJobLabel(p.job)} — {p.name}
                                      </option>
                                    ))}
                                </>
                              ) : (
                                <option value="">{c.select}</option>
                              )}
                            </select>
                            <label className="block text-[10px] text-slate-500">{c.date}</label>
                            <input
                              name="occurred_date"
                              type="date"
                              defaultValue={utcDateToHtmlDateInputValue(t.occurred_at)}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <label className="mt-1 block text-[10px] text-slate-500">{tr.occurredTimeOptional}</label>
                            <input
                              name="occurred_time"
                              type="time"
                              step={60}
                              defaultValue={defaultOccurredTimeInputValue(t.occurred_at)}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <input
                              name="amount"
                              defaultValue={t.amount.toString()}
                              required
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <input name="currency" defaultValue={t.currency} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <select name="visit_type" defaultValue={t.visit_type} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs">
                              {visitOptions.map((v) => (
                                <option key={v} value={v}>
                                  {therapyVisitTypeLabel(uiLanguage, v)}
                                </option>
                              ))}
                            </select>
                            <TherapyTransactionLinkSelect
                              name="linked_transaction_id"
                              householdId={householdId}
                              currentId={t.linked_transaction_id}
                              label={tr.clinicIncomeLink}
                              noneOptionLabel={c.txNoneLinked}
                            />
                            <p className="text-[10px] text-slate-500">{tr.paymentFieldsHint}</p>
                            <label className="block text-[10px] text-slate-500">{tr.paymentDate}</label>
                            <input
                              name="payment_date"
                              type="date"
                              defaultValue={utcDateToHtmlDateInputValue(t.payment_date)}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            />
                            <label className="block text-[10px] text-slate-500">{tr.paymentMethod}</label>
                            <select
                              name="payment_method"
                              defaultValue={t.payment_method ?? ""}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              <option value="">{tr.paymentMethodUnset}</option>
                              <option value="bank_transfer">{tr.paymentBankTransfer}</option>
                              <option value="digital_payment">{tr.paymentDigital}</option>
                            </select>
                            <label className="block text-[10px] text-slate-500">{tr.paymentIntoAccount}</label>
                            <select
                              name="payment_bank_account_id"
                              defaultValue={t.payment_bank_account_id ?? ""}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              <option value="">—</option>
                              {bankAccounts.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.account_name} — {b.bank_name}
                                </option>
                              ))}
                            </select>
                            <label className="block text-[10px] text-slate-500">{tr.paymentDigitalApp}</label>
                            <select
                              name="payment_digital_payment_method_id"
                              defaultValue={t.payment_digital_payment_method_id ?? ""}
                              className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs"
                            >
                              <option value="">—</option>
                              {digitalPaymentMethods.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            {t.receipt_allocations.length > 0 && (
                              <div className="rounded border border-slate-700/80 bg-slate-800/60 px-2 py-2">
                                <p className="mb-1 text-[10px] font-medium text-slate-400">{tr.receiptCol}</p>
                                <p className="mb-1 text-[10px] text-slate-500">{tr.receiptLinkedHint}</p>
                                <ul className="list-none space-y-1">
                                  {t.receipt_allocations.map((a) => (
                                    <li key={a.id}>
                                      <Link
                                        href={`/dashboard/private-clinic/receipts/${a.receipt.id}`}
                                        className="text-xs text-sky-400 hover:underline"
                                      >
                                        #{a.receipt.receipt_number}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <textarea name="note_1" defaultValue={t.note_1 ?? ""} placeholder={note1} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <textarea name="note_2" defaultValue={t.note_2 ?? ""} placeholder={note2} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <textarea name="note_3" defaultValue={t.note_3 ?? ""} placeholder={note3} className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs" />
                            <button type="submit" className="rounded bg-sky-600 px-2 py-1 text-xs text-white">
                              {c.save}
                            </button>
                          </form>
                          <ConfirmDeleteForm action={deleteTherapyTreatment} className="mt-2">
                            <input type="hidden" name="id" value={t.id} />
                            <button type="submit" className="text-xs text-rose-400">
                              {c.delete}
                            </button>
                          </ConfirmDeleteForm>
                          <TherapyTreatmentAttachments
                            treatmentId={t.id}
                            uiLanguage={uiLanguage}
                            attachments={t.attachments.map((a) => ({
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
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
