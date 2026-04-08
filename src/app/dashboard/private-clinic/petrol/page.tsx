import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
} from "@/lib/auth";
import { formatHouseholdDate } from "@/lib/household-date-format";
import {
  carDisplayLabel,
  formatCostPerLitre,
  petrolMetricsByFillupId,
} from "@/lib/petrol-fillups-metrics";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { PetrolCarPicker } from "@/components/petrol-car-picker";
import { PetrolFillupDateTankerFields } from "@/components/petrol-fillup-date-tanker-fields";
import { PetrolFillupFormFields } from "@/components/petrol-fillup-form-fields";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import {
  createPrivateClinicPetrolFillup,
  createPrivateClinicPetrolVehicle,
  deletePrivateClinicPetrolFillup,
  deletePrivateClinicPetrolVehicle,
  updatePrivateClinicPetrolFillup,
  updatePrivateClinicPetrolVehicle,
} from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    carId?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    edit?: string;
    vehicleEdit?: string;
    vehicleSaved?: string;
    vehicleUpdated?: string;
    vehicleDeleted?: string;
  }>;
};

function dateInputValue(d: Date | null | undefined) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function formatMoney(value: unknown) {
  if (value == null) return "—";
  const n =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber(): number }).toNumber()
      : Number(value);
  return Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const inputClass =
  "w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40";
const labelClass = "block text-sm font-medium text-slate-300";

export default async function PrivateClinicPetrolPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const resolved = searchParams ? await searchParams : {};
  const requestedCarId = resolved.carId?.trim() || null;
  const editFillupId = resolved.edit?.trim() || null;
  const editVehicleId = resolved.vehicleEdit?.trim() || null;

  const cars = await prisma.cars.findMany({
    where: { household_id: householdId, is_active: true },
    orderBy: [{ maker: "asc" }, { model: "asc" }],
  });

  const carOptions = cars.map((c) => ({ id: c.id, label: carDisplayLabel(c) }));

  const selectedCarId =
    requestedCarId && cars.some((c) => c.id === requestedCarId) ? requestedCarId : null;

  if (cars.length === 1) {
    const onlyId = cars[0].id;
    if (selectedCarId !== onlyId) {
      const p = new URLSearchParams();
      p.set("carId", onlyId);
      if (resolved.saved) p.set("saved", typeof resolved.saved === "string" ? resolved.saved : "1");
      if (resolved.deleted) p.set("deleted", typeof resolved.deleted === "string" ? resolved.deleted : "1");
      if (resolved.error) p.set("error", resolved.error);
      if (resolved.vehicleEdit) p.set("vehicleEdit", resolved.vehicleEdit);
      if (resolved.vehicleSaved) p.set("vehicleSaved", resolved.vehicleSaved);
      if (resolved.vehicleUpdated) p.set("vehicleUpdated", resolved.vehicleUpdated);
      if (resolved.vehicleDeleted) p.set("vehicleDeleted", resolved.vehicleDeleted);
      p.delete("edit");
      redirect(`/dashboard/private-clinic/petrol?${p.toString()}`);
    }
  }

  const fillups =
    selectedCarId != null
      ? await prisma.car_petrol_fillups.findMany({
          where: { household_id: householdId, car_id: selectedCarId },
          include: { transaction: true, tanked_up_by_family_member: true },
          orderBy: { filled_at: "desc" },
        })
      : [];

  const familyMembers =
    selectedCarId != null
      ? await prisma.family_members.findMany({
          where: { household_id: householdId, is_active: true },
          orderBy: { full_name: "asc" },
          select: { id: true, full_name: true, date_of_birth: true },
        })
      : [];

  const petrolMetrics = petrolMetricsByFillupId(fillups);
  const today = new Date().toISOString().slice(0, 10);

  const editingFillup =
    selectedCarId && editFillupId ? fillups.find((f) => f.id === editFillupId) || null : null;

  const editingCar = editVehicleId ? cars.find((c) => c.id === editVehicleId) ?? null : null;

  const cancelEditHref =
    selectedCarId != null
      ? `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}`
      : "/dashboard/private-clinic/petrol";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">Petrol fill-up</h1>
        <p className="text-sm text-slate-400">
          Choose the car, then enter the pump readout. Delta km and km/L use the previous fill with a lower odometer.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4 sm:p-5">
        <h2 className="text-lg font-medium text-slate-200">Vehicles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add or rename vehicles here for petrol tracking only — no insurance, services, or other car records.
        </p>
        {resolved.vehicleSaved && (
          <p className="mt-3 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
            Vehicle added.
          </p>
        )}
        {resolved.vehicleUpdated && (
          <p className="mt-3 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
            Vehicle updated.
          </p>
        )}
        {resolved.vehicleDeleted && (
          <p className="mt-3 rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
            Vehicle removed from this list.
          </p>
        )}
        <form
          action={createPrivateClinicPetrolVehicle}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="new-vehicle-name">
              Display name (optional)
            </label>
            <input
              id="new-vehicle-name"
              name="custom_name"
              placeholder="e.g. Work car"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-maker">
              Maker
            </label>
            <input
              id="new-maker"
              name="maker"
              required
              placeholder="e.g. Toyota"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new-model">
              Model
            </label>
            <input
              id="new-model"
              name="model"
              required
              placeholder="e.g. Corolla"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="new-plate">
              Plate (optional)
            </label>
            <input
              id="new-plate"
              name="plate_number"
              placeholder="License plate"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-600"
            >
              Add vehicle
            </button>
          </div>
        </form>

        {cars.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No vehicles yet — add one above to log fill-ups.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {cars.map((car) => {
              const editQs = new URLSearchParams();
              if (requestedCarId) editQs.set("carId", requestedCarId);
              editQs.set("vehicleEdit", car.id);
              const editHref = `/dashboard/private-clinic/petrol?${editQs.toString()}`;
              const cancelVehicleHref = requestedCarId
                ? `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(requestedCarId)}`
                : "/dashboard/private-clinic/petrol";

              if (editingCar?.id === car.id) {
                return (
                  <li
                    key={car.id}
                    className="rounded-xl border border-sky-700/50 bg-slate-900/80 p-4"
                  >
                    <form action={updatePrivateClinicPetrolVehicle} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="car_id" value={car.id} />
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor={`edit-name-${car.id}`}>
                          Display name (optional)
                        </label>
                        <input
                          id={`edit-name-${car.id}`}
                          name="custom_name"
                          defaultValue={car.custom_name ?? ""}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`edit-maker-${car.id}`}>
                          Maker
                        </label>
                        <input
                          id={`edit-maker-${car.id}`}
                          name="maker"
                          required
                          defaultValue={car.maker}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor={`edit-model-${car.id}`}>
                          Model
                        </label>
                        <input
                          id={`edit-model-${car.id}`}
                          name="model"
                          required
                          defaultValue={car.model}
                          className={inputClass}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor={`edit-plate-${car.id}`}>
                          Plate (optional)
                        </label>
                        <input
                          id={`edit-plate-${car.id}`}
                          name="plate_number"
                          defaultValue={car.plate_number ?? ""}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <button
                          type="submit"
                          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                        >
                          Save vehicle
                        </button>
                        <Link
                          href={cancelVehicleHref}
                          className="inline-flex items-center rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
                        >
                          Cancel
                        </Link>
                      </div>
                    </form>
                  </li>
                );
              }

              return (
                <li
                  key={car.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-100">{carDisplayLabel(car)}</p>
                    {car.plate_number ? (
                      <p className="text-xs text-slate-500">{car.plate_number}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={editHref}
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-sky-400 hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                    <ConfirmDeleteForm
                      action={deletePrivateClinicPetrolVehicle}
                      message="Remove this vehicle from the petrol list? It will be hidden here; existing fill-ups stay in the database."
                    >
                      <input type="hidden" name="car_id" value={car.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-rose-700/50 px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-950/40"
                      >
                        Remove
                      </button>
                    </ConfirmDeleteForm>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Suspense
        fallback={
          <div className="h-[52px] w-full animate-pulse rounded-xl bg-slate-800/80" aria-hidden />
        }
      >
        <PetrolCarPicker options={carOptions} selectedCarId={selectedCarId} />
      </Suspense>

      {resolved.saved && (
        <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          Fill-up saved.
        </div>
      )}
      {resolved.deleted && (
        <div className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-slate-200">
          Record removed.
        </div>
      )}
      {resolved.error && (
        <div className="rounded-xl border border-rose-600 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
          {decodeURIComponent(resolved.error.replace(/\+/g, " "))}
        </div>
      )}

      {selectedCarId ? (
        <>
          {editFillupId && !editingFillup ? (
            <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
              That fill-up could not be loaded.{" "}
              <Link href={cancelEditHref} className="text-sky-400 underline hover:text-sky-300">
                Clear edit
              </Link>
            </div>
          ) : null}

          <section className="mx-auto w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/50 ring-1 ring-slate-700/80">
            <h2 className="mb-4 text-lg font-medium text-slate-200">
              {editingFillup ? "Edit fill-up" : "New fill-up"}
            </h2>
            <form
              key={editingFillup?.id ?? "new-fillup"}
              action={editingFillup ? updatePrivateClinicPetrolFillup : createPrivateClinicPetrolFillup}
              className="flex flex-col gap-4"
            >
              <PetrolFillupDateTankerFields
                members={familyMembers}
                defaultFilledAt={editingFillup ? dateInputValue(editingFillup.filled_at) : today}
                defaultTankerId={editingFillup?.tanked_up_by_family_member_id ?? null}
              />
              <PetrolFillupFormFields
                carId={selectedCarId}
                fillupId={editingFillup?.id}
                currency={editingFillup?.currency ?? "ILS"}
                defaults={
                  editingFillup
                    ? {
                        amount_paid: editingFillup.amount_paid.toString(),
                        litres: editingFillup.litres.toString(),
                        odometer_km: String(editingFillup.odometer_km),
                      }
                    : {
                        amount_paid: "",
                        litres: "",
                        odometer_km: "",
                      }
                }
              />
              <div className="[&_select]:min-h-[52px] [&_select]:text-base [&_select]:rounded-xl [&_select]:border-slate-600 [&_select]:bg-slate-800 [&_select]:px-4 [&_select]:py-3">
                <TherapyTransactionLinkSelect
                  name="linked_transaction_id"
                  householdId={householdId}
                  currentId={editingFillup?.transaction_id ?? null}
                  label="Linked transaction (optional)"
                  hint="One bank transaction can link to only one petrol record."
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="notes">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  defaultValue={editingFillup?.notes ?? ""}
                  className={`${inputClass} min-h-[88px] resize-y py-3`}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className="min-h-[56px] rounded-xl bg-sky-500 px-5 text-base font-semibold text-slate-950 shadow-md shadow-sky-900/30 hover:bg-sky-400 active:bg-sky-500 sm:flex-1"
                >
                  {editingFillup ? "Save changes" : "Save fill-up"}
                </button>
                {editingFillup ? (
                  <Link
                    href={cancelEditHref}
                    className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-slate-600 px-5 text-base font-medium text-slate-200 hover:bg-slate-800"
                  >
                    Cancel
                  </Link>
                ) : null}
              </div>
            </form>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-slate-200">Recent fill-ups</h2>
            {fillups.length === 0 ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500">
                No fill-ups for this vehicle yet.
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {fillups.map((p) => {
                    const m = petrolMetrics.get(p.id);
                    const tx = p.transaction;
                    const editHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}&edit=${encodeURIComponent(p.id)}`;
                    return (
                      <div
                        key={p.id}
                        className={`rounded-xl border border-slate-700 bg-slate-900/50 p-4 ${editingFillup?.id === p.id ? "ring-1 ring-sky-600/60" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-100">
                              {formatHouseholdDate(p.filled_at, dateDisplayFormat)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.tanked_up_by_family_member?.full_name ?? "—"} · Paid {formatMoney(p.amount_paid)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Link
                              href={editHref}
                              className="text-xs font-medium text-sky-400 hover:text-sky-300"
                            >
                              Edit
                            </Link>
                            <ConfirmDeleteForm action={deletePrivateClinicPetrolFillup.bind(null, p.id, selectedCarId)}>
                              <button
                                type="submit"
                                className="text-xs font-medium text-rose-400 hover:text-rose-300"
                              >
                                Delete
                              </button>
                            </ConfirmDeleteForm>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-300 sm:grid-cols-3">
                          <div>
                            <dt className="text-slate-500">Litres</dt>
                            <dd className="tabular-nums">
                              {Number(p.litres.toString()).toLocaleString("en", {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Odo (km)</dt>
                            <dd className="tabular-nums">{p.odometer_km.toLocaleString("en")}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Delta km</dt>
                            <dd className="tabular-nums">
                              {m?.deltaKm != null ? m.deltaKm.toLocaleString("en") : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Cost/L</dt>
                            <dd>{formatCostPerLitre(m?.costPerLitre ?? null)}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">km/L</dt>
                            <dd className="tabular-nums">
                              {m?.kmPerLitre != null ? m.kmPerLitre.toFixed(2) : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">Bank tx</dt>
                            <dd className="text-slate-400" title={
                                tx
                                  ? `${formatHouseholdDate(tx.transaction_date, dateDisplayFormat)} ${tx.amount.toString()}`
                                  : undefined
                              }>
                              {tx ? "Linked" : "—"}
                            </dd>
                          </div>
                        </dl>
                        {p.notes ? (
                          <p className="mt-2 border-t border-slate-700/80 pt-2 text-xs text-slate-400">{p.notes}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="hidden overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/40 md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-800/80">
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Date</th>
                      <th className="min-w-[7rem] px-3 py-2 font-medium text-slate-300">Tanked by</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Paid</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">L</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Odo (km)</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Delta km</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Cost/L</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">km/L</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Tx</th>
                      <th className="min-w-[6rem] px-3 py-2 font-medium text-slate-300">Notes</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fillups.map((p) => {
                      const m = petrolMetrics.get(p.id);
                      const tx = p.transaction;
                      const editHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}&edit=${encodeURIComponent(p.id)}`;
                      return (
                        <tr
                          key={p.id}
                          className={`border-b border-slate-700/80 ${editingFillup?.id === p.id ? "bg-sky-950/40" : ""}`}
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                            {formatHouseholdDate(p.filled_at, dateDisplayFormat)}
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-2 text-slate-300" title={p.tanked_up_by_family_member?.full_name ?? undefined}>
                            {p.tanked_up_by_family_member?.full_name ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-200">{formatMoney(p.amount_paid)}</td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                            {Number(p.litres.toString()).toLocaleString("en", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                            {p.odometer_km.toLocaleString("en")}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                            {m?.deltaKm != null ? m.deltaKm.toLocaleString("en") : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                            {formatCostPerLitre(m?.costPerLitre ?? null)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-200">
                            {m?.kmPerLitre != null ? m.kmPerLitre.toFixed(2) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-400" title={
                              tx
                                ? `${formatHouseholdDate(tx.transaction_date, dateDisplayFormat)} ${tx.amount.toString()}`
                                : undefined
                            }>
                            {tx ? "✓" : "—"}
                          </td>
                          <td className="max-w-[10rem] truncate px-3 py-2 text-slate-400" title={p.notes ?? undefined}>
                            {p.notes || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Link
                                href={editHref}
                                className="text-xs font-medium text-sky-400 hover:text-sky-300"
                              >
                                Edit
                              </Link>
                              <ConfirmDeleteForm action={deletePrivateClinicPetrolFillup.bind(null, p.id, selectedCarId)}>
                                <button
                                  type="submit"
                                  className="text-xs font-medium text-rose-400 hover:text-rose-300"
                                >
                                  Delete
                                </button>
                              </ConfirmDeleteForm>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>

          <p className="text-center text-xs text-slate-600">
            <Link href={`/dashboard/cars/${selectedCarId}`} className="text-sky-400 hover:text-sky-300">
              Car details & services
            </Link>
            {" · "}
            <Link href="/dashboard/cars" className="text-sky-400 hover:text-sky-300">
              All cars
            </Link>
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-400">
          Select a vehicle above to log a fill-up and see history.
        </p>
      )}
    </div>
  );
}
