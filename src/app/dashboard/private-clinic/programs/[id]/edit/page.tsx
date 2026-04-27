import Link from "next/link";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { prisma, requireHouseholdMember, getCurrentHouseholdId, getCurrentUiLanguage } from "@/lib/auth";
import { privateClinicCommon, privateClinicPrograms } from "@/lib/private-clinic-i18n";
import { redirect, notFound } from "next/navigation";
import { deleteTherapyProgram, saveTherapyProgramVisitTypeDefaults, updateTherapyProgram } from "../../../actions";
import { therapyVisitTypesOrdered } from "@/lib/therapy/visit-type-defaults";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { jobWhereInPrivateClinicModule, jobsWhereActiveForPrivateClinicPickers } from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

const PROGRAMS_BASE = "/dashboard/private-clinic/programs";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ updated?: string; error?: string; fromUpcoming?: string; modal?: string }>;
};

export default async function EditProgramPage({ params, searchParams }: PageProps) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const { id } = await params;
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const pr = privateClinicPrograms(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;
  const fromUpcoming = resolved?.fromUpcoming === "1";
  const showModal = resolved?.modal === "1";

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [program, jobs, treatmentsCount, receiptsCount, seriesCount, appointmentsCount, clientsCount] = await Promise.all([
    prisma.therapy_service_programs.findFirst({
      where: {
        id,
        household_id: householdId,
        job: {
          ...jobWhereInPrivateClinicModule,
          ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
        },
      },
      include: { job: true },
    }),
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
      }),
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_treatments.count({ where: { household_id: householdId, program_id: id } }),
    prisma.therapy_receipts.count({ where: { household_id: householdId, program_id: id } }),
    prisma.therapy_appointment_series.count({ where: { household_id: householdId, program_id: id } }),
    prisma.therapy_appointments.count({ where: { household_id: householdId, program_id: id } }),
    prisma.therapy_clients.count({ where: { household_id: householdId, default_program_id: id } }),
  ]);
  if (!program) notFound();

  const programVisitDefaults = await prisma.therapy_visit_type_default_amounts.findMany({
    where: {
      household_id: householdId,
      program_id: program.id,
    },
  });

  const visitTypes = therapyVisitTypesOrdered();

  function programDefaultFor(vt: (typeof visitTypes)[number]) {
    const row = programVisitDefaults.find((r) => r.visit_type === vt);
    return row ? { amount: row.amount.toString(), currency: row.currency } : { amount: "", currency: "ILS" };
  }

  const editHref = `${PROGRAMS_BASE}/${id}/edit`;
  const backHref = fromUpcoming ? "/dashboard/private-clinic/upcoming-visits" : PROGRAMS_BASE;
  const backLabel = fromUpcoming ? "Back to Upcoming visits" : pr.backToPrograms;
  const redirectSuffix = fromUpcoming ? "?fromUpcoming=1&modal=1" : "";
  const editRedirectHref = `${editHref}${redirectSuffix}`;
  const errorMessage =
    resolved?.error === "missing"
      ? pr.programErrMissing
      : resolved?.error === "job"
        ? pr.programErrJob
        : resolved?.error === "notfound"
          ? pr.programErrNotfound
          : resolved?.error === "id"
            ? pr.programErrId
        : resolved?.error === "linked"
          ? pr.programErrLinked
          : resolved?.error
              ? c.saveFailedGeneric
              : null;

  const canDelete = !(treatmentsCount || receiptsCount || seriesCount || appointmentsCount || clientsCount);
  const jobsForSelect = jobs.some((j) => j.id === program.job_id) ? jobs : [program.job, ...jobs];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const effectiveIsActive = program.is_active && !(program.end_date && program.end_date < todayStart);

  const pageContent = (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-50">{pr.editProgramPageTitle}</h1>
        <Link
          href={backHref}
          className="inline-flex shrink-0 items-center rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          {backLabel}
        </Link>
      </header>

      {errorMessage ? (
        <p className="rounded-lg border border-rose-700 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">{errorMessage}</p>
      ) : null}
      {resolved?.updated && (
        <p className="rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">{c.saved}</p>
      )}

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <form action={updateTherapyProgram} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="redirect_on_success" value={`${editRedirectHref}${editRedirectHref.includes("?") ? "&" : "?"}updated=1`} />
          <input type="hidden" name="redirect_on_error" value={editRedirectHref} />
          <input type="hidden" name="id" value={program.id} />
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.job}</label>
            <select
              name="job_id"
              required
              defaultValue={program.job_id}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {jobsForSelect.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatJobDisplayLabel(j)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{pr.programName}</label>
            <input
              name="name"
              defaultValue={program.name}
              required
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs text-slate-400">{c.description}</label>
            <textarea
              name="description"
              defaultValue={program.description ?? ""}
              placeholder={c.description}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 md:col-span-2">
            <input type="checkbox" name="is_active" defaultChecked={effectiveIsActive} />
            {pr.active}
          </label>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.startDate}</label>
            <input
              name="start_date"
              type="date"
              defaultValue={program.start_date ? program.start_date.toISOString().slice(0, 10) : ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-400">{c.endDate}</label>
            <input
              name="end_date"
              type="date"
              defaultValue={program.end_date ? program.end_date.toISOString().slice(0, 10) : ""}
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
              defaultValue={program.default_session_length_minutes ?? ""}
              className="w-28 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="md:col-span-2 space-y-1">
            <p className="text-xs text-slate-400">{pr.visitFrequency}</p>
            <p className="text-xs text-slate-500">{pr.visitFrequencyHint}</p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="edit_program_visits_per_period_count">
                {pr.visitsPer}
              </label>
              <input
                id="edit_program_visits_per_period_count"
                name="visits_per_period_count"
                type="number"
                min={1}
                max={14}
                step={1}
                defaultValue={program.visits_per_period_count ?? ""}
                className="w-20 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
              <span className="text-xs text-slate-400">{pr.visitsPer}</span>
              <label className="sr-only" htmlFor="edit_program_visits_per_period_weeks">
                {pr.weeks}
              </label>
              <input
                id="edit_program_visits_per_period_weeks"
                name="visits_per_period_weeks"
                type="number"
                min={1}
                max={12}
                step={1}
                defaultValue={program.visits_per_period_weeks ?? ""}
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
                <input
                  type="checkbox"
                  name="supported_visit_types"
                  value="clinic"
                  defaultChecked={program.supported_visit_types.includes("clinic")}
                />
                {pr.visitClinic}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="supported_visit_types"
                  value="home"
                  defaultChecked={program.supported_visit_types.includes("home")}
                />
                {pr.visitHome}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="supported_visit_types"
                  value="phone"
                  defaultChecked={program.supported_visit_types.includes("phone")}
                />
                {pr.visitPhone}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  name="supported_visit_types"
                  value="video"
                  defaultChecked={program.supported_visit_types.includes("video")}
                />
                {pr.visitVideo}
              </label>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              {c.save}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-col items-end gap-1">
          <ConfirmDeleteForm action={deleteTherapyProgram}>
            <input type="hidden" name="redirect_on_success" value={`${PROGRAMS_BASE}?updated=1`} />
            <input type="hidden" name="redirect_on_error" value={editRedirectHref} />
            <input type="hidden" name="id" value={program.id} />
            <button
              type="submit"
              disabled={!canDelete}
              title={!canDelete ? pr.programErrLinked : undefined}
              className="text-sm text-rose-400 enabled:hover:text-rose-300 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {c.delete}
            </button>
          </ConfirmDeleteForm>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
        <h2 className="text-sm font-medium text-slate-200">{c.defaultFeesByVisitType}</h2>
        <p className="text-xs text-slate-500">{c.defaultFeesByVisitTypeHint}</p>
        <form action={saveTherapyProgramVisitTypeDefaults} className="space-y-3">
          <input type="hidden" name="redirect_on_success" value={`${editRedirectHref}${editRedirectHref.includes("?") ? "&" : "?"}updated=1`} />
          <input type="hidden" name="redirect_on_error" value={editRedirectHref} />
          <input type="hidden" name="program_id" value={program.id} />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {visitTypes.map((vt) => {
              const d = programDefaultFor(vt);
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
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            {c.saveDefaults}
          </button>
        </form>
      </section>
    </div>
  );

  return showModal ? (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-slate-950/70 p-4 sm:p-8">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-5">
        {pageContent}
      </div>
    </div>
  ) : (
    pageContent
  );
}
