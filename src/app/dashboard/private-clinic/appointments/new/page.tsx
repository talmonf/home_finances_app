import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicAppointments, privateClinicCommon, weekdayLongLabel } from "@/lib/private-clinic-i18n";
import { formatJobDisplayLabel } from "@/lib/job-label";
import {
  jobWherePrivateClinicScoped,
  jobsWhereActiveForPrivateClinicPickers,
  therapyClientsWhereLinkedPrivateClinicJobs,
} from "@/lib/private-clinic/jobs-scope";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import { redirect } from "next/navigation";
import { AppointmentAddForm } from "../appointment-add-form";

export const dynamic = "force-dynamic";

const LIST = "/dashboard/private-clinic/appointments";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams?: Promise<{
    client?: string;
    job?: string;
    program?: string;
    visitType?: string;
    startAt?: string;
  }>;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const sp = searchParams ? await searchParams : {};

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const ap = privateClinicAppointments(uiLanguage);

  const [jobs, programs, clients] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({ householdId, familyMemberId }),
      orderBy: { start_date: "desc" },
      include: { family_member: true },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        job: jobScope,
      },
      include: { job: true },
    }),
    prisma.therapy_clients.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        ...therapyClientsWhereLinkedPrivateClinicJobs(familyMemberId),
      },
      orderBy: { first_name: "asc" },
    }),
  ]);

  const visitOptions = (["clinic", "home", "phone", "video"] as const).map((v) => ({
    value: v,
    label: therapyVisitTypeLabel(uiLanguage, v),
  }));

  const dow = [0, 1, 2, 3, 4, 5, 6].map((v) => ({
    v,
    label: weekdayLongLabel(uiLanguage, v),
  }));

  const jobOpts = jobs.map((j) => ({ id: j.id, label: formatJobDisplayLabel(j) }));
  const programOpts = programs.map((p) => ({
    id: p.id,
    jobId: p.job_id,
    label: p.name,
  }));
  const clientOpts = clients.map((cl) => ({
    id: cl.id,
    label: `${cl.first_name} ${cl.last_name ?? ""}`.trim(),
    defaultJobId: cl.default_job_id ?? null,
    defaultProgramId: cl.default_program_id ?? null,
    defaultVisitType: cl.default_visit_type ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={LIST} className="text-sm text-slate-400 hover:text-slate-200">
          {ap.backToAppointments}
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{ap.newTitle}</h2>
      </div>

      <AppointmentAddForm
        copy={{
          recurringToggle: ap.recurringToggle,
          clientLabel: c.client,
          jobLabel: c.job,
          jobSelect: c.select,
          programOptional: ap.programOptional,
          visitTypeLabel: ap.visitTypeCol,
          recurrenceLabel: ap.recurringRules,
          dayOfWeekLabel: ap.dayOfWeek,
          startDateTimeLabel: ap.startDateTime,
          endDateTimeOptionalLabel: ap.endOptional,
          timeOfDayLabel: ap.timeOfDay,
          seriesStartDateLabel: ap.seriesStartDate,
          seriesEndDateOptionalLabel: ap.seriesEndDateOptional,
          schedule: ap.schedule,
          createSeriesGenerate: ap.createSeriesGenerate,
          weekly: ap.weekly,
          biweekly: ap.biweekly,
        }}
        visitOptions={visitOptions}
        jobs={jobOpts}
        programs={programOpts}
        clients={clientOpts}
        dow={dow}
        prefill={{
          clientId: sp.client,
          jobId: sp.job,
          programId: sp.program,
          visitType: sp.visitType,
          startAt: sp.startAt,
        }}
        redirectOnSuccess={`${LIST}?created=1`}
      />
    </div>
  );
}
