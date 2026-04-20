import Link from "next/link";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage, getCurrentHouseholdDateDisplayFormat } from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { employmentTypeOptionLabel, privateClinicCommon, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { notFound, redirect } from "next/navigation";
import { saveTherapyJobVisitTypeDefaults, updateTherapyJob } from "../../../actions";
import { therapyVisitTypesOrdered } from "@/lib/therapy/visit-type-defaults";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

const JOBS_BASE = "/dashboard/private-clinic/jobs";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string; error?: string }>;
};

export default async function EditJobPage({ params, searchParams }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const uiLanguage = await getCurrentUiLanguage();
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const c = privateClinicCommon(uiLanguage);
  const j = privateClinicJobs(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const job = await prisma.jobs.findFirst({
    where: {
      id,
      household_id: householdId,
      is_private_clinic: true,
      ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
    },
  });
  if (!job) notFound();

  const jobVisitDefaults = await prisma.therapy_visit_type_default_amounts.findMany({
    where: {
      household_id: householdId,
      program_id: null,
      job_id: job.id,
    },
  });
  const visitTypes = therapyVisitTypesOrdered();

  function jobDefaultFor(vt: (typeof visitTypes)[number]) {
    const row = jobVisitDefaults.find((r) => r.visit_type === vt);
    return row ? { amount: row.amount.toString(), currency: row.currency } : { amount: "", currency: "ILS" };
  }

  const editHref = `${JOBS_BASE}/${id}/edit`;
  const errorMessage =
    resolved?.error === "family"
      ? c.noFamilyMemberJobs
      : resolved?.error === "member"
        ? j.invalidEmployedPerson
        : resolved?.error
          ? c.saveFailedGeneric
          : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-50">{j.editJobPageTitle}</h1>
        <Link
          href={JOBS_BASE}
          className="inline-flex shrink-0 items-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {j.backToJobs}
        </Link>
      </header>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{errorMessage}</p>
      ) : null}
      {resolved?.updated ? (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">{c.saved}</p>
      ) : null}

      <p className="text-sm text-slate-400">{formatJobDisplayLabel(job)}</p>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <form action={updateTherapyJob} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="redirect_on_success" value={`${editHref}?updated=1`} />
          <input type="hidden" name="redirect_on_error" value={editHref} />
          <input type="hidden" name="id" value={job.id} />
          <select name="employment_type" defaultValue={job.employment_type} required className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            <option value="employee">{employmentTypeOptionLabel(uiLanguage, "employee")}</option>
            <option value="freelancer">{employmentTypeOptionLabel(uiLanguage, "freelancer")}</option>
            <option value="self_employed">{employmentTypeOptionLabel(uiLanguage, "self_employed")}</option>
            <option value="contractor_via_company">{employmentTypeOptionLabel(uiLanguage, "contractor_via_company")}</option>
          </select>
          <input
            name="job_title"
            defaultValue={job.job_title}
            required
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_name"
            defaultValue={job.employer_name ?? ""}
            placeholder={j.employerOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.startDate}</label>
            <input
              name="start_date"
              type="date"
              defaultValue={job.start_date.toISOString().slice(0, 10)}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.endDate}</label>
            <input
              name="end_date"
              type="date"
              defaultValue={job.end_date ? job.end_date.toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <input
            name="employer_tax_number"
            defaultValue={job.employer_tax_number ?? ""}
            placeholder={j.employerTaxOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <input
            name="employer_address"
            defaultValue={job.employer_address ?? ""}
            placeholder={j.employerAddressOptional}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_active" defaultChecked={job.is_active} />
            {c.active}
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="is_private_clinic" defaultChecked={job.is_private_clinic} />
            {j.privateClinicRole}
          </label>
          <p className="text-xs text-slate-500 md:col-span-3">{j.privateClinicRoleHelp}</p>
          <textarea
            name="notes"
            defaultValue={job.notes ?? ""}
            placeholder={c.notes}
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 md:col-span-3"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-3">
            <p className="text-xs text-slate-400">
              {employmentTypeOptionLabel(uiLanguage, job.employment_type)} · {formatHouseholdDate(job.start_date, dateDisplayFormat)} -{" "}
              {job.end_date ? formatHouseholdDate(job.end_date, dateDisplayFormat) : c.present}
            </p>
            <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
              {c.save}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">{c.defaultFeesByVisitType}</h2>
        <p className="text-xs text-slate-500">{c.defaultFeesByVisitTypeHint}</p>
        <form action={saveTherapyJobVisitTypeDefaults} className="space-y-3">
          <input type="hidden" name="redirect_on_success" value={`${editHref}?updated=1`} />
          <input type="hidden" name="redirect_on_error" value={editHref} />
          <input type="hidden" name="job_id" value={job.id} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {visitTypes.map((vt) => {
              const d = jobDefaultFor(vt);
              return (
                <div key={vt} className="rounded border border-slate-700/80 bg-slate-950/40 p-2">
                  <label className="block text-xs text-slate-400">{therapyVisitTypeLabel(uiLanguage, vt)}</label>
                  <input
                    name={`amount_${vt}`}
                    type="text"
                    defaultValue={d.amount}
                    placeholder="0.00"
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                  <input
                    name={`currency_${vt}`}
                    type="text"
                    defaultValue={d.currency}
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                  />
                </div>
              );
            })}
          </div>
          <button type="submit" className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            {c.saveDefaults}
          </button>
        </form>
      </section>
    </div>
  );
}
