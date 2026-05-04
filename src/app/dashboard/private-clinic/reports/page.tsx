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
        labels={{
          title: r.monthPayableTitle,
          description: r.monthPayableDesc,
          job: r.monthPayableJob,
          month: r.monthPayableMonth,
          year: r.monthPayableYear,
          download: r.download,
          noJobs: r.monthPayableNoJobs,
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
