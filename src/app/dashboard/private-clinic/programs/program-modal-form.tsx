import { formatJobDisplayLabel } from "@/lib/job-label";
import { privateClinicCommon, privateClinicPrograms } from "@/lib/private-clinic-i18n";

type JobWithMember = {
  id: string;
  job_title: string;
  employer_name: string | null;
  family_member: { full_name: string };
};

export function ProgramModalForm({
  action,
  jobs,
  closeHref,
  redirectOnSuccess,
  redirectOnError,
  c,
  pr,
}: {
  action: (formData: FormData) => void | Promise<void>;
  jobs: JobWithMember[];
  closeHref: string;
  redirectOnSuccess: string;
  redirectOnError: string;
  c: ReturnType<typeof privateClinicCommon>;
  pr: ReturnType<typeof privateClinicPrograms>;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-slate-100">{pr.addProgramTitle}</h2>
          <a href={closeHref} className="text-sm text-sky-400 hover:text-sky-300">
            {c.cancel}
          </a>
        </div>
        <form action={action} className="grid gap-3 rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={redirectOnSuccess} />
          <input type="hidden" name="redirect_on_error" value={redirectOnError} />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.job}</label>
            <select
              name="job_id"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{c.job}</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatJobDisplayLabel(j)} — {j.family_member.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{pr.programName}</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs text-slate-400">{c.description}</label>
            <textarea
              name="description"
              placeholder={c.description}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked />
            {pr.active}
          </label>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.startDate}</label>
            <input
              name="start_date"
              type="date"
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
          <div className="space-y-1">
            <label className="block text-xs text-slate-300">Default session length (minutes)</label>
            <input
              name="default_session_length_minutes"
              type="number"
              min={1}
              max={999}
              step={1}
              className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <p className="text-xs text-slate-400">{pr.visitFrequency}</p>
            <p className="text-xs text-slate-500">{pr.visitFrequencyHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="modal_program_visits_per_period_count">
                {pr.visitsPer}
              </label>
              <input
                id="modal_program_visits_per_period_count"
                name="visits_per_period_count"
                type="number"
                min={1}
                max={14}
                step={1}
                placeholder="1"
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-400">{pr.visitsPer}</span>
              <label className="sr-only" htmlFor="modal_program_visits_per_period_weeks">
                {pr.weeks}
              </label>
              <input
                id="modal_program_visits_per_period_weeks"
                name="visits_per_period_weeks"
                type="number"
                min={1}
                max={12}
                step={1}
                placeholder="1"
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-400">{pr.weeks}</span>
            </div>
          </div>
          <div className="md:col-span-2 space-y-2">
            <p className="text-xs text-slate-400">{pr.supportedVisitTypes}</p>
            <p className="text-xs text-slate-500">{pr.supportedVisitTypesHint}</p>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="supported_visit_types" value="clinic" defaultChecked />
                {pr.visitClinic}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="supported_visit_types" value="home" defaultChecked />
                {pr.visitHome}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="supported_visit_types" value="phone" defaultChecked />
                {pr.visitPhone}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="supported_visit_types" value="video" defaultChecked />
                {pr.visitVideo}
              </label>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {pr.addProgramBtn}
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
