import { HouseholdDateField } from "@/components/household-date-field";
import { createUtility } from "./actions";

type PayeeOption = { id: string; name: string };

type UtilityModalFormProps = {
  action: typeof createUtility;
  propertyId: string;
  payees: PayeeOption[];
  utilityTypeLabels: Record<string, string>;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  isHebrew: boolean;
};

export function UtilityModalForm({
  action,
  propertyId,
  payees,
  utilityTypeLabels,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  isHebrew,
}: UtilityModalFormProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">
            {isHebrew ? "הוספת תשתית" : "Add utility"}
          </h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {isHebrew ? "ביטול" : "Cancel"}
          </a>
        </div>
        <form
          action={action}
          className="grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="property_id" value={propertyId} />
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div>
            <label htmlFor="modal_utility_type" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "סוג" : "Type"}
            </label>
            <select
              id="modal_utility_type"
              name="utility_type"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="" disabled>
                {isHebrew ? "בחרו סוג" : "Select type"}
              </option>
              {Object.entries(utilityTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="modal_provider_name" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "שם ספק" : "Provider name"}
            </label>
            <input
              id="modal_provider_name"
              name="provider_name"
              required
              placeholder="e.g. Bezeq"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_payee_id" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "קישור לנמען (אופציונלי)" : "Link to payee (optional)"}
            </label>
            <select
              id="modal_payee_id"
              name="payee_id"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {payees.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="modal_account_number" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "מספר חשבון" : "Account number"}
            </label>
            <input
              id="modal_account_number"
              name="account_number"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_meter_number" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "מספר מונה" : "Meter number"}
            </label>
            <input
              id="modal_meter_number"
              name="meter_number"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_start_date" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "תאריך התחלה (אופציונלי)" : "Start date (optional)"}
            </label>
            <HouseholdDateField
              id="modal_start_date"
              name="start_date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_renewal_date" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "תאריך חידוש (אופציונלי)" : "Renewal date (optional)"}
            </label>
            <HouseholdDateField
              id="modal_renewal_date"
              name="renewal_date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_website_url" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "אתר האינטרנט של הספק" : "Utility website URL"}
            </label>
            <input
              id="modal_website_url"
              name="website_url"
              type="url"
              inputMode="url"
              placeholder="https://"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_contact_phone" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "טלפון" : "Phone"}
            </label>
            <input
              id="modal_contact_phone"
              name="contact_phone"
              type="tel"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="modal_contact_email" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "אימייל" : "Email"}
            </label>
            <input
              id="modal_contact_email"
              name="contact_email"
              type="email"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_facebook_url" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "קישור לפייסבוק" : "Facebook URL"}
            </label>
            <input
              id="modal_facebook_url"
              name="facebook_url"
              type="url"
              inputMode="url"
              placeholder="https://facebook.com/..."
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_notes_utility" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <input
              id="modal_notes_utility"
              name="notes"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "הוספת תשתית" : "Add utility"}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {isHebrew ? "ביטול" : "Cancel"}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
