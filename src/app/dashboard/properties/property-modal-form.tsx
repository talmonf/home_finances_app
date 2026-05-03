import { createProperty } from "./actions";

type PropertyModalFormProps = {
  action: typeof createProperty;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  isHebrew: boolean;
};

export function PropertyModalForm({
  action,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  isHebrew,
}: PropertyModalFormProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-screen-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">
            {isHebrew ? "הוספת נכס" : "Add property"}
          </h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {isHebrew ? "ביטול" : "Cancel"}
          </a>
        </div>
        <form
          action={action}
          className="grid gap-4 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div>
            <label htmlFor="modal_prop_name" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "שם" : "Name"}
            </label>
            <input
              id="modal_prop_name"
              name="name"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={isHebrew ? "למשל: הבית הראשי" : "e.g. Main home"}
            />
          </div>
          <div>
            <label htmlFor="modal_prop_type" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "סוג" : "Type"}
            </label>
            <select
              id="modal_prop_type"
              name="property_type"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">—</option>
              <option value="owned">Owned</option>
              <option value="rental">Rental</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="modal_prop_landlord" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "בשם מי" : "In whose name"}
            </label>
            <input
              id="modal_prop_landlord"
              name="landlord_name"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_prop_address" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "כתובת" : "Address"}
            </label>
            <textarea
              id="modal_prop_address"
              name="address"
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={isHebrew ? "כתובת מלאה" : "Full address"}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_prop_landlord_contact" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "פרטי קשר (טלפון / אימייל)" : "Contact details (phone / email)"}
            </label>
            <textarea
              id="modal_prop_landlord_contact"
              name="landlord_contact"
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="modal_prop_notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <textarea
              id="modal_prop_notes"
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
            >
              {isHebrew ? "הוספת נכס" : "Add property"}
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
