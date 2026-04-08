import {
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicPetrol } from "@/lib/private-clinic-i18n";
import { createPrivateClinicPetrolVehicle } from "../../../actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const inputClass =
  "w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const labelClass = "block text-sm font-medium text-slate-300";

const ADD_VEHICLE_PATH = "/dashboard/private-clinic/petrol/vehicle/new";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function PrivateClinicPetrolAddVehiclePage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const pp = privateClinicPetrol(uiLanguage);
  const resolved = searchParams ? await searchParams : {};
  const errorParam = resolved.error?.trim();

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{pp.addVehicle}</h1>
        <p className="text-sm text-slate-400">{pp.vehiclesHelp}</p>
      </header>

      {errorParam ? (
        <div className="rounded-xl border border-rose-600 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
          {decodeURIComponent(errorParam.replace(/\+/g, " "))}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 sm:p-5">
        <form action={createPrivateClinicPetrolVehicle} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="redirect_on_error" value={ADD_VEHICLE_PATH} />
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="new-vehicle-name">
              {pp.displayNameOptional}
            </label>
            <input
              id="new-vehicle-name"
              name="custom_name"
              placeholder={pp.phWorkCar}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-maker">
              {pp.maker}
            </label>
            <input
              id="new-maker"
              name="maker"
              required
              placeholder={pp.phToyota}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-model">
              {pp.model}
            </label>
            <input
              id="new-model"
              name="model"
              required
              placeholder={pp.phCorolla}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="new-plate">
              {pp.plateOptional}
            </label>
            <input
              id="new-plate"
              name="plate_number"
              placeholder={pp.licensePlate}
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="min-h-[52px] rounded-xl bg-sky-500 px-5 text-base font-semibold text-slate-950 shadow-md shadow-sky-900/30 hover:bg-sky-400"
            >
              {pp.addVehicle}
            </button>
            <Link
              href="/dashboard/private-clinic/petrol"
              className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-slate-600 px-5 text-base font-medium text-slate-200 hover:bg-slate-800"
            >
              {pp.backToPetrol}
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
