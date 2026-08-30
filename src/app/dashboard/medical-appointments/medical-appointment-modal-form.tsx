import { DashboardModal } from "@/components/dashboard-modal";
import {
  MedicalAppointmentPaymentMethod as PaymentMethodValues,
  MedicalReimbursementSource as ReimbursementSourceValues,
} from "@/generated/prisma/enums";
import type { UiLanguage } from "@/lib/ui-language";
import { medicalPaymentLabel, reimbursementSourceLabel } from "@/lib/ui-labels";
import { createMedicalAppointment } from "./actions";

type FamilyMemberOption = { id: string; full_name: string };
type CreditCardOption = { id: string; card_name: string; card_last_four: string };
type BankAccountOption = { id: string; account_name: string; bank_name: string };
type DigitalMethodOption = { id: string; name: string };

type MedicalAppointmentModalFormProps = {
  action: typeof createMedicalAppointment;
  closeHref: string;
  closeLabel: string;
  title: string;
  errorMessage?: string | null;
  isHebrew: boolean;
  uiLanguage: UiLanguage;
  familyMembers: FamilyMemberOption[];
  creditCards: CreditCardOption[];
  bankAccounts: BankAccountOption[];
  digitalMethods: DigitalMethodOption[];
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

export function MedicalAppointmentModalForm({
  action,
  closeHref,
  closeLabel,
  title,
  errorMessage,
  isHebrew,
  uiLanguage,
  familyMembers,
  creditCards,
  bankAccounts,
  digitalMethods,
}: MedicalAppointmentModalFormProps) {
  return (
    <DashboardModal title={title} closeHref={closeHref} closeLabel={closeLabel}>
      {errorMessage ? (
        <div className="mb-4 rounded-lg border border-rose-600 bg-rose-950/60 px-3 py-2 text-xs text-rose-100">
          {errorMessage}
        </div>
      ) : null}
      <form action={action} className="space-y-6 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
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
              <label htmlFor="digital_payment_method_id" className="mb-1 block text-xs font-medium text-slate-400">
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
              <label htmlFor="reimbursement_received_at" className="mb-1 block text-xs font-medium text-slate-400">
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
    </DashboardModal>
  );
}
