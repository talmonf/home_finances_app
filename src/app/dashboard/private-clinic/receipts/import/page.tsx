import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicCommon, privateClinicReceipts, privateClinicTreatments } from "@/lib/private-clinic-i18n";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TherapyTreatmentsImportForm } from "@/components/therapy-treatments-import-form";
import {
  jobWhereInPrivateClinicModule,
  jobsWhereActiveForPrivateClinicPickers,
  formatPrivateClinicJobLabel,
} from "@/lib/private-clinic/jobs-scope";

export const dynamic = "force-dynamic";

export default async function ReceiptsImportPage() {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const tr = privateClinicTreatments(uiLanguage);
  const r = privateClinicReceipts(uiLanguage);

  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true, default_currency: true },
  });
  const familyMemberId = user?.family_member_id ?? null;

  const [linkedJobRows, linkedProgramRows, household] = await Promise.all([
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
    prisma.households.findUnique({
      where: { id: householdId },
      select: { primary_currency: true },
    }),
  ]);
  const linkedJobIds = linkedJobRows.map((row) => row.job_id);
  const linkedProgramIds = linkedProgramRows
    .map((row) => row.program_id)
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

  const defaultUsualTreatmentCost = "";
  const defaultUsualTreatmentCostCurrency = (user?.default_currency || household?.primary_currency || "ILS").toUpperCase();

  return (
    <div className="space-y-4">
      <p>
        <Link
          href="/dashboard/private-clinic/receipts"
          className="text-sm text-sky-400 hover:underline"
        >
          {r.importBackToReceipts}
        </Link>
      </p>
      <TherapyTreatmentsImportForm
        variant="receipts"
        defaultUsualTreatmentCost={defaultUsualTreatmentCost}
        defaultUsualTreatmentCostCurrency={defaultUsualTreatmentCostCurrency}
        jobs={jobs.map((j) => ({ id: j.id, title: formatPrivateClinicJobLabel(j) }))}
        programs={programs.map((p) => ({
          id: p.id,
          jobId: p.job_id,
          name: p.name,
          jobLabel: formatPrivateClinicJobLabel(p.job),
        }))}
        labels={{
          title: r.importTitleReceipts,
          instructions: r.importInstructionsReceipts,
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
          clearPreview: tr.importClearPreview,
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
          importErrUnlinkedReceiptWithRow: tr.importErrUnlinkedReceiptWithRow,
          importErrUnlinkedReceipt: tr.importErrUnlinkedReceipt,
          importErrAllocationMismatchWithRow: tr.importErrAllocationMismatchWithRow,
          importErrAllocationMismatch: tr.importErrAllocationMismatch,
          importDebugTitle: tr.importDebugTitle,
          importCreatedCountsTitle: tr.importCreatedCountsTitle,
          importCreatedClients: tr.importCreatedClients,
          importCreatedTreatments: tr.importCreatedTreatments,
          importCreatedReceipts: tr.importCreatedReceipts,
          importCreatedAllocations: tr.importCreatedAllocations,
          importCreatedConsultations: tr.importCreatedConsultations,
          importCreatedTravel: tr.importCreatedTravel,
          importCreatedPrograms: tr.importCreatedPrograms,
          importDetailedMessagePrefix: tr.importDetailedMessagePrefix,
          importDetailedMessageCreated: tr.importDetailedMessageCreated,
          importWorkingAnalyze: tr.importWorkingAnalyze,
          importWorkingCommit: tr.importWorkingCommit,
          importWorkingElapsed: tr.importWorkingElapsed,
          importWorkingProgress: tr.importWorkingProgress,
          importWorkingLeaveWarning: tr.importWorkingLeaveWarning,
          importWorkingDoNotNavigate: tr.importWorkingDoNotNavigate,
          importDebugUnlinkedReceipts: tr.importDebugUnlinkedReceipts,
          importDebugOrgPaymentRows: tr.importDebugOrgPaymentRows,
          importDebugCommitLinkTitle: tr.importDebugCommitLinkTitle,
          importDebugMissingAllocationLinks: tr.importDebugMissingAllocationLinks,
          importDebugMissingMarkPaidLinks: tr.importDebugMissingMarkPaidLinks,
          usualTreatmentCostLabel: r.usualTreatmentCostLabel,
          usualTreatmentCostCurrencyLabel: c.currency,
          usualTreatmentCostHint: r.usualTreatmentCostHint,
          saveUsualTreatmentCostDefault: r.saveUsualTreatmentCostDefault,
          importReceiptsNeedingManualTreatment: r.importReceiptsNeedingManualTreatment,
        }}
      />
    </div>
  );
}
