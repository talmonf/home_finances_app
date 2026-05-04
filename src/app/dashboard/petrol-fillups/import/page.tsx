import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { carDisplayLabel } from "@/lib/petrol-fillups-metrics";
import { PetrolFillupsImportForm } from "@/components/petrol-fillups-import-form";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ carId?: string }>;
};

const L = {
  chooseFile: "Spreadsheet file",
  instructions:
    "First analyze the file to see a preview and any row issues. Import runs only after the preview is clean and you click Import rows.",
  analyze: "Analyze file",
  confirm: "Import rows",
  clearPreview: "Clear preview",
  previewTitle: "Preview",
  validRows: (n: number) => `${n} row(s) ready to import.`,
  rowIssuesTitle: "Row issues (fix the file and analyze again)",
  fatalTitle: "Cannot parse file",
  sheetLabel: "Sheet",
  sheetPickHint: "Choose a sheet, then analyze again if you change it.",
  workingAnalyze: "Analyzing…",
  workingCommit: "Importing…",
  sampleNote: "Showing up to 40 sample rows.",
  commitBlocked: "Fix all row issues before importing.",
  tableDate: "Date",
  tableAmount: "Amount",
  tableLitres: "Litres",
  tableOdo: "Odometer (km)",
  tableNotes: "Notes",
};

export default async function PetrolFillupsImportPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : {};
  const carId = resolved.carId?.trim() || null;
  if (!carId) {
    redirect("/dashboard/petrol-fillups");
  }

  const car = await prisma.cars.findFirst({
    where: { id: carId, household_id: householdId, is_active: true },
    select: { id: true, maker: true, model: true, custom_name: true, model_year: true },
  });
  if (!car) {
    redirect("/dashboard/petrol-fillups");
  }

  const dateFormat = await getCurrentHouseholdDateDisplayFormat();
  const formatHint = HOUSEHOLD_DATE_FORMAT_LABELS[dateFormat];
  const backHref = `/dashboard/petrol-fillups?carId=${encodeURIComponent(car.id)}`;
  const afterImportHref = backHref;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-10 pt-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">Import petrol fill-ups</h1>
        <p className="text-sm text-slate-400">
          Vehicle: <span className="text-slate-200">{carDisplayLabel(car)}</span>
        </p>
      </header>

      <p className="text-sm text-slate-400">
        Required columns: <code className="text-slate-300">filled_at</code> (or <code className="text-slate-300">date</code>
        ), <code className="text-slate-300">amount_paid</code> (or <code className="text-slate-300">amount</code>),{" "}
        <code className="text-slate-300">litres</code>, <code className="text-slate-300">odometer_km</code> (or{" "}
        <code className="text-slate-300">odometer</code>). Optional: <code className="text-slate-300">notes</code>. Dates:{" "}
        <code className="text-slate-300">yyyy-mm-dd</code> or your household format ({formatHint}).
      </p>

      <PetrolFillupsImportForm
        carId={car.id}
        variant="household"
        afterImportHref={afterImportHref}
        labels={L}
      />

      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800"
      >
        Back to petrol
      </Link>
    </div>
  );
}
