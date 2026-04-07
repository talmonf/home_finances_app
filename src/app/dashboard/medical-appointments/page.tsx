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
  MedicalAppointmentPaymentMethod as PaymentMethodValues,
  MedicalReimbursementSource as ReimbursementSourceValues,
  type MedicalAppointmentPaymentMethod,
  type MedicalReimbursementSource,
} from "@/generated/prisma/enums";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createMedicalAppointment } from "./actions";
import { medicalPaymentLabel, reimbursementSourceLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type PageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
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
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
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

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
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
          {(resolvedSearchParams?.created ||
            resolvedSearchParams?.updated ||
            resolvedSearchParams?.error) && (
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                resolvedSearchParams?.error
                  ? "border-rose-600 bg-rose-950/60 text-rose-100"
                  : "border-emerald-600 bg-emerald-950/40 text-emerald-100"
              }`}
            >
              <span>
                {resolvedSearchParams?.error
                  ? decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))
                  : resolvedSearchParams?.created
                    ? "Appointment added."
                    : "Updated."}
              </span>
            </div>
          )}
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">{isHebrew ? "הוספת תור" : "Add appointment"}</h2>
          <form
            action={createMedicalAppointment}
            className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Visit</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="appointment_date" className="mb-1 block text-xs font-medium text-slate-400">
                    Appointment date
                  </label>
                  <input id="appointment_date" name="appointment_date" type="date" required className={inputClass} />
                </div>
                <div>
                  <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                    Provider / clinic
                  </label>
                  <input
                    id="provider_name"
                    name="provider_name"
                    required
                    className={inputClass}
                    placeholder="e.g. Dr. Cohen, Ichilov outpatient"
                  />
                </div>
                <div>
                  <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Family member (optional)
                  </label>
                  <select id="family_member_id" name="family_member_id" className={inputClass}>
                    <option value="">—</option>
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="visit_description" className="mb-1 block text-xs font-medium text-slate-400">
                    Visit type / specialty (optional)
                  </label>
                  <input
                    id="visit_description"
                    name="visit_description"
                    className={inputClass}
                    placeholder="e.g. Dermatology follow-up, MRI referral"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="visit_notes" className="mb-1 block text-xs font-medium text-slate-400">
                    Visit notes (optional)
                  </label>
                  <textarea
                    id="visit_notes"
                    name="visit_notes"
                    rows={3}
                    className={inputClass}
                    placeholder="Anything to remember about this visit"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">{isHebrew ? "תשלום" : "Payment"}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="amount_out_of_pocket" className="mb-1 block text-xs font-medium text-slate-400">
                    {isHebrew ? "השתתפות עצמית (אופציונלי)" : "Amount out of pocket (optional)"}
                  </label>
                  <input
                    id="amount_out_of_pocket"
                    name="amount_out_of_pocket"
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                    Currency
                  </label>
                  <input id="currency" name="currency" defaultValue="ILS" className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="payment_method" className="mb-1 block text-xs font-medium text-slate-400">
                    How you paid (optional)
                  </label>
                  <select id="payment_method" name="payment_method" className={inputClass} defaultValue="">
                    <option value="">Not specified yet</option>
                    {Object.values(PaymentMethodValues).map((value) => (
                      <option key={value} value={value}>
                        {medicalPaymentLabel(uiLanguage, value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Credit card (if paid by card)
                  </label>
                  <select id="credit_card_id" name="credit_card_id" className={inputClass}>
                    <option value="">—</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.card_name} · ****{c.card_last_four}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bank_account_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Bank account (if transfer / debit)
                  </label>
                  <select id="bank_account_id" name="bank_account_id" className={inputClass}>
                    <option value="">—</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} · {a.bank_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="digital_payment_method_id"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    Digital wallet (if Bit, PayBox, etc.)
                  </label>
                  <select id="digital_payment_method_id" name="digital_payment_method_id" className={inputClass}>
                    <option value="">—</option>
                    {digitalMethods.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Kupat holim reimbursement</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="kupat_holim_request_submitted_at"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    Request submitted on (optional)
                  </label>
                  <input
                    id="kupat_holim_request_submitted_at"
                    name="kupat_holim_request_submitted_at"
                    type="date"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label htmlFor="kupat_holim_notes" className="mb-1 block text-xs font-medium text-slate-400">
                    Notes (reference #, status, etc.)
                  </label>
                  <input id="kupat_holim_notes" name="kupat_holim_notes" className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Private medical insurance</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="private_insurance_request_submitted_at"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    Request submitted on (optional)
                  </label>
                  <input
                    id="private_insurance_request_submitted_at"
                    name="private_insurance_request_submitted_at"
                    type="date"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label htmlFor="private_insurance_notes" className="mb-1 block text-xs font-medium text-slate-400">
                    Notes
                  </label>
                  <input id="private_insurance_notes" name="private_insurance_notes" className={inputClass} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Reimbursement received</h3>
              <p className="mb-3 text-xs text-slate-500">
                When money is paid back, record it once here (usually either kupat holim or private insurance).
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label
                    htmlFor="reimbursement_amount_received"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    {isHebrew ? "סכום שהתקבל (אופציונלי)" : "Amount received (optional)"}
                  </label>
                  <input
                    id="reimbursement_amount_received"
                    name="reimbursement_amount_received"
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reimbursement_received_at"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    {isHebrew ? "תאריך קבלה (אופציונלי)" : "Date received (optional)"}
                  </label>
                  <input
                    id="reimbursement_received_at"
                    name="reimbursement_received_at"
                    type="date"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="reimbursement_source" className="mb-1 block text-xs font-medium text-slate-400">
                    Paid by (required if amount or date is set)
                  </label>
                  <select id="reimbursement_source" name="reimbursement_source" className={inputClass}>
                    <option value="">—</option>
                    {Object.values(ReimbursementSourceValues).map((value) => (
                      <option key={value} value={value}>
                        {reimbursementSourceLabel(uiLanguage, value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
              >
                {isHebrew ? "הוספת תור" : "Add appointment"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-slate-200">History</h2>
          {appointments.length === 0 ? (
            <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
              {isHebrew ? "אין תורים עדיין. אפשר להוסיף למעלה." : "No appointments yet. Add one above."}
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
                  {appointments.map((row) => (
                    <tr key={row.id} className="border-b border-slate-700/80 align-top hover:bg-slate-800/40">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-200">
                        {formatHouseholdDate(row.appointment_date, dateDisplayFormat)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
