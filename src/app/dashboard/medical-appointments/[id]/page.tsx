import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import {
  MedicalAppointmentPaymentMethod as PaymentMethodValues,
  MedicalReimbursementSource as ReimbursementSourceValues,
  type MedicalAppointmentPaymentMethod,
  type MedicalReimbursementSource,
} from "@/generated/prisma/enums";
import Link from "next/link";
import { redirect } from "next/navigation";
import { updateMedicalAppointment } from "../actions";

export const dynamic = "force-dynamic";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const REIMBURSEMENT_SOURCE_LABELS: Record<MedicalReimbursementSource, string> = {
  kupat_holim: "Kupat holim",
  private_insurance: "Private insurance",
};

const PAYMENT_LABELS: Record<MedicalAppointmentPaymentMethod, string> = {
  cash: "Cash",
  credit_card: "Credit card",
  bank_account: "Bank account / transfer",
  digital_wallet: "Digital wallet",
  kupat_holim_benefit: "Kupat holim (covered / no out-of-pocket)",
  other: "Other",
};

export default async function EditMedicalAppointmentPage({ params, searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const today = startOfToday();

  const appointment = await prisma.medical_appointments.findFirst({
    where: { id, household_id: householdId },
  });

  if (!appointment) redirect("/dashboard/medical-appointments?error=Not+found");

  const [familyMembers, creditCards, bankAccounts, digitalMethods] = await Promise.all([
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(appointment.credit_card_id ? [{ id: appointment.credit_card_id }] : []),
          {
            cancelled_at: null,
            OR: [{ expiry_date: null }, { expiry_date: { gte: today } }],
          },
        ],
      },
      orderBy: { card_name: "asc" },
    }),
    prisma.bank_accounts.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(appointment.bank_account_id ? [{ id: appointment.bank_account_id }] : []),
          { is_active: true },
        ],
      },
      orderBy: { account_name: "asc" },
    }),
    prisma.digital_payment_methods.findMany({
      where: {
        household_id: householdId,
        OR: [
          ...(appointment.digital_payment_method_id
            ? [{ id: appointment.digital_payment_method_id }]
            : []),
          { is_active: true },
        ],
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const inputClass =
    "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

  const amountOop =
    appointment.amount_out_of_pocket != null ? String(appointment.amount_out_of_pocket) : "";
  const reimbursementAmount =
    appointment.reimbursement_amount_received != null
      ? String(appointment.reimbursement_amount_received)
      : "";

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-6xl space-y-8 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-3">
          <Link
            href="/dashboard/medical-appointments"
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה לתורים רפואיים →" : "← Back to medical appointments"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">{isHebrew ? "עריכת תור" : "Edit appointment"}</h1>
          <p className="text-sm text-slate-400">
            {appointment.provider_name} · {isoDate(appointment.appointment_date)}
          </p>
          {resolvedSearchParams?.error && (
            <div className="rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
              {decodeURIComponent(resolvedSearchParams.error.replace(/\+/g, " "))}
            </div>
          )}
        </header>

        <section className="space-y-4">
          <form
            action={updateMedicalAppointment}
            className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
          >
            <input type="hidden" name="id" value={appointment.id} />

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Visit</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="appointment_date" className="mb-1 block text-xs font-medium text-slate-400">
                    Appointment date
                  </label>
                  <input
                    id="appointment_date"
                    name="appointment_date"
                    type="date"
                    required
                    defaultValue={isoDate(appointment.appointment_date)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="provider_name" className="mb-1 block text-xs font-medium text-slate-400">
                    Provider / clinic
                  </label>
                  <input
                    id="provider_name"
                    name="provider_name"
                    required
                    defaultValue={appointment.provider_name}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="family_member_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Family member (optional)
                  </label>
                  <select
                    id="family_member_id"
                    name="family_member_id"
                    defaultValue={appointment.family_member_id ?? ""}
                    className={inputClass}
                  >
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
                    defaultValue={appointment.visit_description ?? ""}
                    className={inputClass}
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
                    defaultValue={appointment.notes ?? ""}
                    className={inputClass}
                    placeholder="Anything to remember about this visit"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-300">Payment</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="amount_out_of_pocket" className="mb-1 block text-xs font-medium text-slate-400">
                    Amount out of pocket (optional)
                  </label>
                  <input
                    id="amount_out_of_pocket"
                    name="amount_out_of_pocket"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={amountOop}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="currency" className="mb-1 block text-xs font-medium text-slate-400">
                    Currency
                  </label>
                  <input id="currency" name="currency" defaultValue={appointment.currency} className={inputClass} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="payment_method" className="mb-1 block text-xs font-medium text-slate-400">
                    How you paid (optional)
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    defaultValue={appointment.payment_method ?? ""}
                    className={inputClass}
                  >
                    <option value="">Not specified yet</option>
                    {Object.values(PaymentMethodValues).map((value) => (
                      <option key={value} value={value}>
                        {PAYMENT_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="credit_card_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Credit card (if paid by card)
                  </label>
                  <select
                    id="credit_card_id"
                    name="credit_card_id"
                    defaultValue={appointment.credit_card_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.card_name} · ****{c.card_last_four}
                        {c.cancelled_at ? " (cancelled)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bank_account_id" className="mb-1 block text-xs font-medium text-slate-400">
                    Bank account (if transfer / debit)
                  </label>
                  <select
                    id="bank_account_id"
                    name="bank_account_id"
                    defaultValue={appointment.bank_account_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.account_name} · {a.bank_name}
                        {!a.is_active ? " (inactive)" : ""}
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
                  <select
                    id="digital_payment_method_id"
                    name="digital_payment_method_id"
                    defaultValue={appointment.digital_payment_method_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {digitalMethods.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {!d.is_active ? " (inactive)" : ""}
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
                    defaultValue={
                      appointment.kupat_holim_request_submitted_at
                        ? isoDate(appointment.kupat_holim_request_submitted_at)
                        : ""
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label htmlFor="kupat_holim_notes" className="mb-1 block text-xs font-medium text-slate-400">
                    Notes (reference #, status, etc.)
                  </label>
                  <input
                    id="kupat_holim_notes"
                    name="kupat_holim_notes"
                    defaultValue={appointment.kupat_holim_notes ?? ""}
                    className={inputClass}
                  />
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
                    defaultValue={
                      appointment.private_insurance_request_submitted_at
                        ? isoDate(appointment.private_insurance_request_submitted_at)
                        : ""
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label htmlFor="private_insurance_notes" className="mb-1 block text-xs font-medium text-slate-400">
                    Notes
                  </label>
                  <input
                    id="private_insurance_notes"
                    name="private_insurance_notes"
                    defaultValue={appointment.private_insurance_notes ?? ""}
                    className={inputClass}
                  />
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
                    Amount received (optional)
                  </label>
                  <input
                    id="reimbursement_amount_received"
                    name="reimbursement_amount_received"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={reimbursementAmount}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="reimbursement_received_at"
                    className="mb-1 block text-xs font-medium text-slate-400"
                  >
                    Date received (optional)
                  </label>
                  <input
                    id="reimbursement_received_at"
                    name="reimbursement_received_at"
                    type="date"
                    defaultValue={
                      appointment.reimbursement_received_at
                        ? isoDate(appointment.reimbursement_received_at)
                        : ""
                    }
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="reimbursement_source" className="mb-1 block text-xs font-medium text-slate-400">
                    Paid by (required if amount or date is set)
                  </label>
                  <select
                    id="reimbursement_source"
                    name="reimbursement_source"
                    defaultValue={appointment.reimbursement_source ?? ""}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {Object.values(ReimbursementSourceValues).map((value) => (
                      <option key={value} value={value}>
                        {REIMBURSEMENT_SOURCE_LABELS[value]}
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
                {isHebrew ? "שמירת שינויים" : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
