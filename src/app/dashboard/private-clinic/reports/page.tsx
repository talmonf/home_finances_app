import Link from "next/link";
import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { formatJobDisplayLabel } from "@/lib/job-label";
import { privateClinicReports } from "@/lib/private-clinic-i18n";
import { jobWherePrivateClinicScoped } from "@/lib/private-clinic/jobs-scope";
import { redirect } from "next/navigation";
import { MonthPayableReportClient } from "./month-payable-report-client";
import { TherapistDiaryReportClient } from "./therapist-diary-report-client";

export const dynamic = "force-dynamic";

export default async function PrivateClinicReportsPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;
  const jobScope = jobWherePrivateClinicScoped(familyMemberId);

  const uiLanguage = await getCurrentUiLanguage();
  const r = privateClinicReports(uiLanguage);

  const allowedJobs = await prisma.jobs.findMany({
    where: { household_id: householdId, ...jobScope },
    select: { id: true, job_title: true, employer_name: true },
    orderBy: [{ start_date: "desc" }],
  });
  const monthPayableJobOptions = allowedJobs.map((j) => ({
    id: j.id,
    label: formatJobDisplayLabel(j),
  }));
  const allowedJobIds = allowedJobs.map((j) => j.id);

  const [monthPayablePrograms, monthPayableConsultationTypes, monthPayableClients] =
    await Promise.all([
      allowedJobIds.length === 0
        ? Promise.resolve([] as { id: string; name: string; job_id: string }[])
        : prisma.therapy_service_programs.findMany({
            where: { household_id: householdId, job_id: { in: allowedJobIds } },
            select: { id: true, name: true, job_id: true },
            orderBy: [{ sort_order: "asc" }, { name: "asc" }],
          }),
      prisma.therapy_consultation_types.findMany({
        where: { household_id: householdId },
        select: { id: true, name: true },
        orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      }),
      prisma.therapy_clients.findMany({
        where: { household_id: householdId, is_active: true },
        select: { id: true, first_name: true, last_name: true },
        orderBy: [{ first_name: "asc" }, { last_name: "asc" }],
      }),
    ]);

  const monthPayableProgramOptions = monthPayablePrograms.map((pr) => ({
    id: pr.id,
    name: pr.name,
    jobId: pr.job_id,
  }));
  const monthPayableConsultationTypeOptions = monthPayableConsultationTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
  }));
  const monthPayableClientOptions = monthPayableClients.map((c) => ({
    id: c.id,
    label: `${c.first_name} ${c.last_name ?? ""}`.trim(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/private-clinic"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Clinic
        </Link>
        <h2 className="mt-2 text-lg font-medium text-slate-200">{r.title}</h2>
        <p className="text-sm text-slate-400">{r.intro}</p>
      </div>

      <MonthPayableReportClient
        jobs={monthPayableJobOptions}
        programs={monthPayableProgramOptions}
        consultationTypes={monthPayableConsultationTypeOptions}
        clients={monthPayableClientOptions}
        labels={{
          title: r.monthPayableTitle,
          description: r.monthPayableDesc,
          job: r.monthPayableJob,
          month: r.monthPayableMonth,
          year: r.monthPayableYear,
          download: r.download,
          noJobs: r.monthPayableNoJobs,
          includeLines: r.monthPayableIncludeLines,
          treatments: r.monthPayableTreatments,
          consultations: r.monthPayableConsultations,
          travel: r.monthPayableTravel,
          program: r.monthPayableProgram,
          consultationType: r.monthPayableConsultationType,
          client: r.monthPayableClient,
          clearFilters: r.monthPayableClearFilters,
          multiSelectHint: r.monthPayableMultiSelectHint,
          programFilterNote: r.monthPayableProgramFilterNote,
          clientFilterTravelNote: r.monthPayableClientFilterTravelNote,
        }}
      />

      <TherapistDiaryReportClient
        labels={{
          title: r.therapistDiaryTitle,
          description: r.therapistDiaryDesc,
          yearFrom: r.therapistDiaryYearFrom,
          yearTo: r.therapistDiaryYearTo,
          download: r.download,
        }}
      />
    </div>
  );
}
