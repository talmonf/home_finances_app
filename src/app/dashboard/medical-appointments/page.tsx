import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import {
  formatHouseholdDate,
  type HouseholdDateDisplayFormat,
} from "@/lib/household-date-format";
import {
  type MedicalAppointmentPaymentMethod,
  type MedicalReimbursementSource,
} from "@/generated/prisma/enums";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMedicalAppointment } from "./actions";
import { MedicalAppointmentModalForm } from "./medical-appointment-modal-form";
import { getI18n } from "@/lib/i18n";
import { medicalPaymentLabel, reimbursementSourceLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

const LIST_BASE = "/dashboard/medical-appointments";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type AppointmentListStatus = "upcoming" | "notReimbursed" | "reimbursed";

function isReimbursementRecorded(
  receivedAt: Date | null,
  source: MedicalReimbursementSource | null,
  amount: unknown,
) {
  return receivedAt != null || source != null || amount != null;
}

function classifyAppointmentStatus(
  appointmentDate: Date,
  today: Date,
  reimbursed: boolean,
): AppointmentListStatus {
  if (appointmentDate >= today) return "upcoming";
  return reimbursed ? "reimbursed" : "notReimbursed";
}

const STATUS_PILL_CLASS: Record<AppointmentListStatus, string> = {
  upcoming: "bg-sky-500/15 text-sky-300",
  notReimbursed: "bg-amber-500/15 text-amber-200",
  reimbursed: "bg-emerald-500/15 text-emerald-300",
};

const STATUS_PILL_ACTIVE_CLASS: Record<AppointmentListStatus, string> = {
  upcoming: "ring-1 ring-sky-400",
  notReimbursed: "ring-1 ring-amber-400",
  reimbursed: "ring-1 ring-emerald-400",
};

const STATUS_ROW_CLASS: Record<AppointmentListStatus, string> = {
  upcoming: "border-l-2 border-sky-500",
  notReimbursed: "border-l-2 border-amber-500",
  reimbursed: "border-l-2 border-emerald-600/60",
};

const STATUS_FILTERS: AppointmentListStatus[] = ["upcoming", "notReimbursed", "reimbursed"];

function parseStatusFilter(raw: string | undefined): AppointmentListStatus | null {
  if (raw === "upcoming" || raw === "notReimbursed" || raw === "reimbursed") return raw;
  return null;
}

function medicalAppointmentsHref(opts: { status?: AppointmentListStatus | null; modal?: "new" } = {}) {
  const sp = new URLSearchParams();
  if (opts.status) sp.set("status", opts.status);
  if (opts.modal) sp.set("modal", opts.modal);
  const q = sp.toString();
  return q ? `${LIST_BASE}?${q}` : LIST_BASE;
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
    modal?: string;
    status?: string;
  }>;
};

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMoneyWithCurrency(value: unknown, currency: string) {
  const amount = formatMoney(value);
  if (amount === "—") return "—";
  return `${amount} ${currency}`;
}

function formatScheme(scheme: string) {
  if (scheme === "amex") return "Amex";
  if (scheme === "diners_club") return "Diners Club";
  if (scheme === "isracard") return "Isracard";
  if (scheme === "mastercard") return "Mastercard";
  if (scheme === "visa") return "Visa";
  return "Other";
}

function formatPaymentDetail(
  method: MedicalAppointmentPaymentMethod | null,
  language: "en" | "he",
  row: {
    credit_card: {
      card_name: string;
      scheme: string;
      issuer_name: string;
      card_last_four: string;
    } | null;
    bank_account: { account_name: string; bank_name: string } | null;
    digital_payment_method: { name: string } | null;
  },
) {
  if (!method) {
    return language === "he" ? "טרם צוין" : "Not specified yet";
  }
  const base = medicalPaymentLabel(language, method);
  if (method === "credit_card" && row.credit_card) {
    const c = row.credit_card;
    return `${base}: ${c.card_name} (${formatScheme(c.scheme)}) · ****${c.card_last_four}`;
  }
  if (method === "bank_account" && row.bank_account) {
    return `${base}: ${row.bank_account.account_name} · ${row.bank_account.bank_name}`;
  }
  if (method === "digital_wallet" && row.digital_payment_method) {
    return `${base}: ${row.digital_payment_method.name}`;
  }
  return base;
}

function formatReimbursementBlock(
  submittedAt: Date | null,
  notes: string | null,
  dateDisplayFormat: HouseholdDateDisplayFormat,
) {
  if (!submittedAt && !notes?.trim()) {
    return <span className="text-slate-500">—</span>;
  }
  const parts: string[] = [];
  if (submittedAt) {
    parts.push(`Request filed ${formatHouseholdDate(submittedAt, dateDisplayFormat)}`);
  }
  if (notes?.trim()) {
    parts.push(notes.trim());
  }
  return (
    <span className="whitespace-pre-wrap text-slate-300">
      {parts.join(" · ")}
    </span>
  );
}

function formatReimbursementPaid(
  currency: string,
  receivedAt: Date | null,
  source: MedicalReimbursementSource | null,
  amount: unknown,
  dateDisplayFormat: HouseholdDateDisplayFormat,
  language: "en" | "he",
) {
  if (receivedAt == null && source == null && amount == null) {
    return <span className="text-slate-500">—</span>;
  }
  const parts: string[] = [];
  if (amount != null) {
    parts.push(formatMoneyWithCurrency(amount, currency));
  }
  if (receivedAt) {
    parts.push(`received ${formatHouseholdDate(receivedAt, dateDisplayFormat)}`);
  }
  if (source) {
    parts.push(`${language === "he" ? "דרך" : "via"} ${reimbursementSourceLabel(language, source)}`);
  }
  return <span className="whitespace-pre-wrap text-slate-300">{parts.join(" · ")}</span>;
}

export default async function MedicalAppointmentsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";
  const i18n = getI18n(uiLanguage);
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modalMode = resolvedSearchParams?.modal === "new" ? "new" : null;
  const statusFilter = parseStatusFilter(resolvedSearchParams?.status);
  const errorMessage = resolvedSearchParams?.error
    ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
    : null;
  const today = startOfToday();

  const [appointments, familyMembers, creditCards, bankAccounts, digitalMethods] = await Promise.all([
    prisma.medical_appointments.findMany({
      where: { household_id: householdId },
      include: {
        family_member: true,
        credit_card: true,
        bank_account: true,
        digital_payment_method: true,
      },
      orderBy: { appointment_date: "desc" },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
      },
      orderBy: { card_name: "asc" },
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

  const showPageBanner =
    Boolean(resolvedSearchParams?.created || resolvedSearchParams?.updated) ||
    Boolean(errorMessage && !modalMode);

  const statusLabels: Record<AppointmentListStatus, string> = {
    upcoming: i18n.medical.upcoming,
    notReimbursed: i18n.medical.notReimbursed,
    reimbursed: i18n.medical.reimbursed,
  };
  const statusCounts: Record<AppointmentListStatus, number> = {
    upcoming: 0,
    notReimbursed: 0,
    reimbursed: 0,
  };
  const appointmentStatuses = appointments.map((row) => {
    const status = classifyAppointmentStatus(
      row.appointment_date,
      today,
      isReimbursementRecorded(
        row.reimbursement_received_at,
        row.reimbursement_source,
        row.reimbursement_amount_received,
      ),
    );
    statusCounts[status] += 1;
    return status;
  });
  const visibleAppointments = appointments.flatMap((row, index) => {
    const status = appointmentStatuses[index];
    if (statusFilter && status !== statusFilter) return [];
    return [{ row, status }];
  });
  const listHref = medicalAppointmentsHref({ status: statusFilter });
  const addHref = medicalAppointmentsHref({ status: statusFilter, modal: "new" });

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-screen-2xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <div>
            <Link href="/" className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200">
              {isHebrew ? "חזרה ללוח הבקרה →" : "← Back to dashboard"}
            </Link>
            <h1 className="text-2xl font-semibold text-slate-50">Medical appointments</h1>
            <p className="text-sm text-slate-400">
              Log visits, how you paid, and reimbursement requests to your kupat holim or private medical
              insurance.
            </p>
          </div>
          {showPageBanner ? (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                errorMessage && !modalMode
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {errorMessage && !modalMode
                  ? errorMessage
                  : resolvedSearchParams?.created
                    ? "Appointment added."
                    : "Updated."}
              </span>
            </div>
          ) : null}
        </header>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="text-lg font-medium text-slate-200">{i18n.medical.history}</h2>
              {appointments.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {STATUS_FILTERS.map((status) => {
                    const isActive = statusFilter === status;
                    return (
                      <Link
                        key={status}
                        href={isActive ? LIST_BASE : medicalAppointmentsHref({ status })}
                        aria-pressed={isActive}
                        title={
                          isActive
                            ? isHebrew
                              ? "הצגת כל התורים"
                              : "Show all appointments"
                            : isHebrew
                              ? `סינון: ${statusLabels[status]}`
                              : `Filter: ${statusLabels[status]}`
                        }
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-0.5 transition hover:brightness-125 ${STATUS_PILL_CLASS[status]} ${
                          isActive
                            ? STATUS_PILL_ACTIVE_CLASS[status]
                            : statusFilter
                              ? "opacity-55 hover:opacity-100"
                              : ""
                        }`}
                      >
                        <span>{statusLabels[status]}</span>
                        <span className="tabular-nums font-semibold">{statusCounts[status]}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Link
              href={addHref}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              {i18n.medical.addAppointment}
            </Link>
          </div>
          {appointments.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew
                ? "אין תורים עדיין. לחצו על ״הוספת תור״ כדי להוסיף."
                : "No appointments yet. Use “Add appointment” to add one."}
            </p>
          ) : visibleAppointments.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {i18n.medical.noMatchingAppointments}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/80">
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "תאריך" : "Date"}</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Provider</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Member</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Visit notes</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Out of pocket</th>
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "תשלום" : "Payment"}</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Kupat holim (claim)</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Private insurance (claim)</th>
                    <th className="px-4 py-3 font-medium text-slate-300">Reimbursement paid</th>
                    <th className="px-4 py-3 font-medium text-slate-300">{isHebrew ? "עריכה" : "Edit"}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAppointments.map(({ row, status }) => {
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-slate-700/80 align-top hover:bg-slate-800/40 ${STATUS_ROW_CLASS[status]}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-slate-200">
                          <div>{formatHouseholdDate(row.appointment_date, dateDisplayFormat)}</div>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_PILL_CLASS[status]}`}
                          >
                            {statusLabels[status]}
                          </span>
                        </td>
                      <td className="px-4 py-3 text-slate-100">
                        <div className="font-medium">{row.provider_name}</div>
                        {row.visit_description ? (
                          <div className="text-xs text-slate-400">{row.visit_description}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{row.family_member?.full_name ?? "—"}</td>
                      <td className="max-w-[200px] px-4 py-3 text-xs text-slate-400">
                        {row.notes?.trim() ? (
                          <span className="whitespace-pre-wrap">{row.notes}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatMoneyWithCurrency(row.amount_out_of_pocket, row.currency)}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-slate-300">
                        {formatPaymentDetail(row.payment_method, uiLanguage, row)}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs">
                        {formatReimbursementBlock(
                          row.kupat_holim_request_submitted_at,
                          row.kupat_holim_notes,
                          dateDisplayFormat,
                        )}
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs">
                        {formatReimbursementBlock(
                          row.private_insurance_request_submitted_at,
                          row.private_insurance_notes,
                          dateDisplayFormat,
                        )}
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-xs">
                        {formatReimbursementPaid(
                          row.currency,
                          row.reimbursement_received_at,
                          row.reimbursement_source,
                          row.reimbursement_amount_received,
                          dateDisplayFormat,
                          uiLanguage,
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/dashboard/medical-appointments/${row.id}`}
                          className="text-xs font-medium text-sky-400 hover:text-sky-300"
                        >
                          {isHebrew ? "עריכה" : "Edit"}
                        </Link>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {modalMode === "new" ? (
          <MedicalAppointmentModalForm
            action={createMedicalAppointment}
            closeHref={listHref}
            closeLabel={i18n.common.cancel}
            title={i18n.medical.addAppointment}
            errorMessage={errorMessage}
            isHebrew={isHebrew}
            uiLanguage={uiLanguage}
            familyMembers={familyMembers}
            creditCards={creditCards}
            bankAccounts={bankAccounts}
            digitalMethods={digitalMethods}
          />
        ) : null}
      </div>
    </div>
  );
}
