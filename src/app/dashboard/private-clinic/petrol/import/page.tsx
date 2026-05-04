import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { HOUSEHOLD_DATE_FORMAT_LABELS } from "@/lib/household-date-format";
import { privateClinicPetrol } from "@/lib/private-clinic-i18n";
import { carDisplayLabel } from "@/lib/petrol-fillups-metrics";
import { importPrivateClinicPetrolFillupsFromSpreadsheet } from "@/app/dashboard/private-clinic/actions";
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
  const pp = privateClinicPetrol(uiLanguage);
  const dateFormat = await getCurrentHouseholdDateDisplayFormat();
  const formatHint = HOUSEHOLD_DATE_FORMAT_LABELS[dateFormat];
  const backHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(car.id)}`;

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-50">{pp.importTitle}</h1>
        <p className="text-sm text-slate-400">
          {pp.vehiclePickerLabel}: <span className="text-slate-200">{carDisplayLabel(car)}</span>
        </p>
      </header>

      <p className="text-sm text-slate-400">
        {pp.importIntro} ({formatHint})
      </p>

      <form action={importPrivateClinicPetrolFillupsFromSpreadsheet} className="space-y-4">
        <input type="hidden" name="car_id" value={car.id} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300" htmlFor="petrol-import-file-pc">
            {pp.importFileLabel}
          </label>
          <input
            id="petrol-import-file-pc"
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
            {pp.importSubmit}
          </button>
          <Link
            href={backHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-600 px-5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            {pp.importBack}
          </Link>
        </div>
      </form>
    </div>
  );
}
