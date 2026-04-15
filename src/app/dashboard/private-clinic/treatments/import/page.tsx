import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicCommon, privateClinicTreatments } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TherapyTreatmentsImportForm } from "@/components/therapy-treatments-import-form";
import {
  jobWhereInPrivateClinicModule,
  jobsWhereActiveForPrivateClinicPickers,
  formatPrivateClinicJobLabel,
} from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

export default async function TreatmentsImportPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const tr = privateClinicTreatments(uiLanguage);

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [linkedJobRows, linkedProgramRows] = await Promise.all([
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      distinct: ["job_id"],
      select: { job_id: true },
    }),
    prisma.therapy_treatments.findMany({
      where: { household_id: householdId },
      distinct: ["program_id"],
      select: { program_id: true },
    }),
  ]);
  const linkedJobIds = linkedJobRows.map((r) => r.job_id);
  const linkedProgramIds = linkedProgramRows
    .map((r) => r.program_id)
    .filter((id): id is string => id != null);

  const [jobs, programs] = await Promise.all([
    prisma.jobs.findMany({
      where: jobsWhereActiveForPrivateClinicPickers({
        householdId,
        familyMemberId,
        includeJobIds: linkedJobIds,
      }),
      orderBy: { start_date: "desc" },
    }),
    prisma.therapy_service_programs.findMany({
      where: {
        household_id: householdId,
        OR: [
          {
            job: {
              ...jobWhereInPrivateClinicModule,
              ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
            },
          },
          ...(linkedProgramIds.length ? [{ id: { in: linkedProgramIds } }] : []),
        ],
      },
      orderBy: [{ sort_order: "asc" }, { name: "asc" }],
      include: { job: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <p>
        <Link
          href="/dashboard/private-clinic/treatments"
          className="text-sm text-sky-400 hover:underline"
        >
          {tr.importBackToTreatments}
        </Link>
      </p>
      <TherapyTreatmentsImportForm
        jobs={jobs.map((j) => ({ id: j.id, title: formatPrivateClinicJobLabel(j) }))}
        programs={programs.map((p) => ({
          id: p.id,
          jobId: p.job_id,
          name: p.name,
          jobLabel: formatPrivateClinicJobLabel(p.job),
        }))}
        labels={{
          title: tr.importTitle,
          instructions: tr.importInstructions,
          profile: tr.importProfile,
          profilePrivate: tr.importProfilePrivate,
          profileOrg: tr.importProfileOrg,
          job: c.job,
          program: c.program,
          autoProgramHint: tr.importAutoProgramHint,
          chooseFile: tr.importChooseFile,
          sheet: tr.importSheet,
          missingVisitType: tr.importMissingVisitType,
          noFallback: tr.importNoFallback,
          visitClinic: tr.importVisitClinic,
          visitHome: tr.importVisitHome,
          visitPhone: tr.importVisitPhone,
          visitVideo: tr.importVisitVideo,
          analyze: tr.importAnalyze,
          confirm: tr.importConfirm,
          cancel: c.cancel,
          summaryTitle: tr.importSummaryTitle,
          newClients: tr.importNewClients,
          treatments: tr.importTreatments,
          receipts: tr.importReceipts,
          programsToCreate: tr.importProgramsToCreate,
          warningTitle: tr.importWarnings,
          errorsTitle: tr.importErrors,
          conflictsTitle: tr.importConflicts,
          applyNote: tr.importApplyNote,
          downloadExample: tr.importDownloadExample,
        }}
      />
    </div>
  );
}
