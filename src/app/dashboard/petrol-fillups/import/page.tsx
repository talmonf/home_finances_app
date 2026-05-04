import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { carDisplayLabel } from "@/lib/petrol-fillups-metrics";
import { importCarPetrolFillupsFromSpreadsheet } from "@/app/dashboard/cars/actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ carId?: string }>;
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

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 pb-10 pt-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">Import petrol fill-ups</h1>
        <p className="text-sm text-slate-400">
          Vehicle: <span className="text-slate-200">{carDisplayLabel(car)}</span>
        </p>
      </header>

      <p className="text-sm text-slate-400">
        Upload a CSV or Excel file (.xlsx). First row: headers. Required columns:{" "}
        <code className="text-slate-300">filled_at</code> (or <code className="text-slate-300">date</code>),{" "}
        <code className="text-slate-300">amount_paid</code> (or <code className="text-slate-300">amount</code>),{" "}
        <code className="text-slate-300">litres</code>, <code className="text-slate-300">odometer_km</code> (or{" "}
        <code className="text-slate-300">odometer</code>). Optional: <code className="text-slate-300">notes</code>.
        Dates: <code className="text-slate-300">yyyy-mm-dd</code> or your household format ({formatHint}).
      </p>

      <form action={importCarPetrolFillupsFromSpreadsheet} className="space-y-4">
        <input type="hidden" name="car_id" value={car.id} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300" htmlFor="petrol-import-file">
            Spreadsheet file
          </label>
          <input
            id="petrol-import-file"
            name="file"
            type="file"
            required
            accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-sky-500"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="min-h-[48px] rounded-xl bg-sky-500 px-5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
          >
            Import
          </button>
          <Link
            href={backHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-600 px-5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Back to petrol
          </Link>
        </div>
      </form>
    </div>
  );
}
