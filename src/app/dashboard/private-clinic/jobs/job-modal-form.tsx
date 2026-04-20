import { employmentTypeOptionLabel, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import type { UiLanguage } from "@/lib/ui-language";

type HouseholdMemberOption = {
  id: string;
  full_name: string;
};

export function JobModalForm({
  action,
  householdMembers,
  familyMemberId,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  c,
  j,
  uiLanguage,
}: {
  action: (formData: FormData) => void | Promise<void>;
  householdMembers: HouseholdMemberOption[];
  familyMemberId: string | null;
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  c: ReturnType<typeof privateClinicCommon>;
  j: ReturnType<typeof privateClinicJobs>;
  uiLanguage: UiLanguage;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{j.addJobTitle}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {c.cancel}
          </a>
        </div>
        <form action={action} className="grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 md:grid-cols-3">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          {!familyMemberId ? (
            <div className="space-y-1 md:col-span-3">
              <label className="block text-xs text-slate-400">{j.employedPerson}</label>
              <select
                name="family_member_id"
                required
                className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{c.select}</option>
                {householdMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">{j.employedPersonHelp}</p>
            </div>
          ) : null}
          <select name="employment_type" required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="">{j.employmentType}</option>
            <option value="employee">{employmentTypeOptionLabel(uiLanguage, "employee")}</option>
            <option value="freelancer">{employmentTypeOptionLabel(uiLanguage, "freelancer")}</option>
            <option value="self_employed">{employmentTypeOptionLabel(uiLanguage, "self_employed")}</option>
            <option value="contractor_via_company">{employmentTypeOptionLabel(uiLanguage, "contractor_via_company")}</option>
          </select>
          <input
            name="job_title"
            placeholder={j.jobTitle}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_name"
            placeholder={j.employerOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.startDate}</label>
            <input
              name="start_date"
              type="date"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.endDate}</label>
            <input
              name="end_date"
              type="date"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <input
            name="employer_tax_number"
            placeholder={j.employerTaxOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_address"
            placeholder={j.employerAddressOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            {c.active}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_private_clinic" defaultChecked />
            {j.privateClinicRole}
          </label>
          <p className="text-xs text-slate-500 md:col-span-3">{j.privateClinicRoleHelp}</p>
          <textarea
            name="notes"
            placeholder={c.notes}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-3"
          />
          <div className="flex flex-wrap items-center gap-3 md:col-span-3">
            <button type="submit" className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
              {j.addJobBtn}
            </button>
            <a href={closeHref} className="text-sm text-slate-300 hover:text-slate-100">
              {c.cancel}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
