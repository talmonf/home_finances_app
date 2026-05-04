import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { privateClinicCommon, privateClinicPetrol } from "@/lib/private-clinic-i18n";
import { carDisplayLabel } from "@/lib/petrol-fillups-metrics";
import { PetrolFillupsImportForm } from "@/components/petrol-fillups-import-form";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ carId?: string }>;
};

export default async function PrivateClinicPetrolImportPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : {};
  const carId = resolved.carId?.trim() || null;
  if (!carId) {
    redirect("/dashboard/private-clinic/petrol");
  }

  const car = await prisma.cars.findFirst({
    where: { id: carId, household_id: householdId, is_active: true },
    select: { id: true, maker: true, model: true, custom_name: true, model_year: true },
  });
  if (!car) {
    redirect("/dashboard/private-clinic/petrol");
  }

  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const pp = privateClinicPetrol(uiLanguage);
  const dateFormat = await getCurrentHouseholdDateDisplayFormat();
  const formatHint = HOUSEHOLD_DATE_FORMAT_LABELS[dateFormat];
  const backHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(car.id)}`;

  const labels = {
    chooseFile: pp.importFileLabel,
    instructions: `${pp.importIntro} (${formatHint})`,
    analyze: pp.importAnalyze,
    confirm: pp.importConfirm,
    clearPreview: pp.importClearPreview,
    previewTitle: pp.importPreviewTitle,
    validRowsTemplate: pp.importValidRowsTemplate,
    rowIssuesTitle: pp.importRowIssuesTitle,
    fatalTitle: pp.importFatalTitle,
    sheetLabel: pp.importSheetLabel,
    sheetPickHint: pp.importSheetPickHint,
    workingAnalyze: pp.importWorkingAnalyze,
    workingCommit: pp.importWorkingCommit,
    sampleNote: pp.importSampleNote,
    commitBlocked: pp.importCommitBlocked,
    tableDate: pp.tableDate,
    tableAmount: pp.amountPaid,
    tableLitres: pp.importColumnLitres,
    tableOdo: pp.odometerKm,
    tableNotes: c.notes,
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">{pp.importTitle}</h1>
        <p className="text-sm text-slate-400">
          {pp.vehiclePickerLabel}: <span className="text-slate-200">{carDisplayLabel(car)}</span>
        </p>
      </header>

      <PetrolFillupsImportForm carId={car.id} variant="private_clinic" afterImportHref={backHref} labels={labels} />

      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800"
      >
        {pp.importBack}
      </Link>
    </div>
  );
}
