import {
  prisma,
  requireHouseholdMember,
  getCurrentHouseholdId,
  getCurrentHouseholdDateDisplayFormat,
  getCurrentUiLanguage,
} from "@/lib/auth";
import { privateClinicCommon, privateClinicPetrol } from "@/lib/private-clinic-i18n";
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
  deletePrivateClinicPetrolFillup,
  updatePrivateClinicPetrolFillup,
} from "../actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    carId?: string;
    mode?: string;
    saved?: string;
    deleted?: string;
    error?: string;
    edit?: string;
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
  const uiLanguage = await getCurrentUiLanguage();
  const c = privateClinicCommon(uiLanguage);
  const pp = privateClinicPetrol(uiLanguage);
  const resolved = searchParams ? await searchParams : {};
  const requestedCarId = resolved.carId?.trim() || null;
  const requestedMode = resolved.mode?.trim() || null;
  const editFillupId = resolved.edit?.trim() || null;
  const mode = requestedMode === "new" || requestedMode === "edit" ? requestedMode : null;

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
    selectedCarId && mode === "edit" && editFillupId
      ? fillups.find((f) => f.id === editFillupId) || null
      : null;
  const showFillupForm = Boolean(selectedCarId && (mode === "new" || (mode === "edit" && editFillupId)));

  const cancelEditHref =
    selectedCarId != null
      ? `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}`
      : "/dashboard/private-clinic/petrol";
  const addFillupHref =
    selectedCarId != null
      ? `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}&mode=new`
      : "/dashboard/private-clinic/petrol";

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">{pp.title}</h1>
        <p className="text-sm text-slate-400">{pp.subtitle}</p>
      </header>

      {resolved.vehicleSaved && (
        <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {pp.vehicleAdded}
        </div>
      )}
      {resolved.vehicleUpdated && (
        <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-100">
          {pp.vehicleUpdated}
        </div>
      )}
      {resolved.vehicleDeleted && (
        <div className="rounded-lg border border-slate-600 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">
          {pp.vehicleRemoved}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Suspense
            fallback={
              <div className="h-[52px] w-full animate-pulse rounded-xl bg-slate-800/80" aria-hidden />
            }
          >
            <PetrolCarPicker
              options={carOptions}
              selectedCarId={selectedCarId}
              basePath="/dashboard/private-clinic/petrol"
              vehicleLabel={pp.vehiclePickerLabel}
              selectPlaceholder={pp.selectVehiclePlaceholder}
            />
          </Suspense>
        </div>
        <Link
          href="/dashboard/private-clinic/petrol/vehicle/new"
          className="inline-flex min-h-[52px] shrink-0 items-center justify-center whitespace-nowrap rounded-xl border border-slate-600 bg-slate-800/80 px-4 text-sm font-semibold text-slate-100 hover:bg-slate-800"
        >
          {pp.addVehicle}
        </Link>
      </div>

      {cars.length === 0 ? (
        <p className="text-sm text-slate-500">{pp.noVehicles}</p>
      ) : null}

      {resolved.saved && (
        <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
          {c.fillUpSaved}
        </div>
      )}
      {resolved.deleted && (
        <div className="rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-3 text-sm text-slate-200">
          {c.deleted}
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
              {c.couldNotLoadFillup}{" "}
              <Link href={cancelEditHref} className="text-sky-400 underline hover:text-sky-300">
                {c.clearEdit}
              </Link>
            </div>
          ) : null}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-medium text-slate-200">{c.recentFillUps}</h2>
              <Link
                href={addFillupHref}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
              >
                {pp.newFillUp}
              </Link>
            </div>
            {fillups.length === 0 ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500">
                {pp.noFillUpsForVehicle}
              </p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {fillups.map((p) => {
                    const m = petrolMetrics.get(p.id);
                    const tx = p.transaction;
                    const editHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}&mode=edit&edit=${encodeURIComponent(p.id)}`;
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
                              {p.tanked_up_by_family_member?.full_name ?? "—"} · {c.paid} {formatMoney(p.amount_paid)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Link
                              href={editHref}
                              className="text-xs font-medium text-sky-400 hover:text-sky-300"
                            >
                              {pp.edit}
                            </Link>
                            <ConfirmDeleteForm action={deletePrivateClinicPetrolFillup.bind(null, p.id, selectedCarId)}>
                              <button
                                type="submit"
                                className="text-xs font-medium text-rose-400 hover:text-rose-300"
                              >
                                {c.delete}
                              </button>
                            </ConfirmDeleteForm>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-300 sm:grid-cols-3">
                          <div>
                            <dt className="text-slate-500">{pp.litres}</dt>
                            <dd className="tabular-nums">
                              {Number(p.litres.toString()).toLocaleString("en", {
                                minimumFractionDigits: 3,
                                maximumFractionDigits: 3,
                              })}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">{pp.odo}</dt>
                            <dd className="tabular-nums">{p.odometer_km.toLocaleString("en")}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">{pp.deltaKm}</dt>
                            <dd className="tabular-nums">
                              {m?.deltaKm != null ? m.deltaKm.toLocaleString("en") : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">{pp.costPerL}</dt>
                            <dd>{formatCostPerLitre(m?.costPerLitre ?? null)}</dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">{pp.kmPerL}</dt>
                            <dd className="tabular-nums">
                              {m?.kmPerLitre != null ? m.kmPerLitre.toFixed(2) : "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-slate-500">{c.bankTx}</dt>
                            <dd className="text-slate-400" title={
                                tx
                                  ? `${formatHouseholdDate(tx.transaction_date, dateDisplayFormat)} ${tx.amount.toString()}`
                                  : undefined
                              }>
                              {tx ? c.linked : "—"}
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
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.tableDate}</th>
                      <th className="min-w-[7rem] px-3 py-2 font-medium text-slate-300">{c.tankedBy}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{c.paid}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.litres}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.odo}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.deltaKm}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.costPerL}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.kmPerL}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">{pp.tx}</th>
                      <th className="min-w-[6rem] px-3 py-2 font-medium text-slate-300">{c.notes}</th>
                      <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fillups.map((p) => {
                      const m = petrolMetrics.get(p.id);
                      const tx = p.transaction;
                      const editHref = `/dashboard/private-clinic/petrol?carId=${encodeURIComponent(selectedCarId)}&mode=edit&edit=${encodeURIComponent(p.id)}`;
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
                                {pp.edit}
                              </Link>
                              <ConfirmDeleteForm action={deletePrivateClinicPetrolFillup.bind(null, p.id, selectedCarId)}>
                                <button
                                  type="submit"
                                  className="text-xs font-medium text-rose-400 hover:text-rose-300"
                                >
                                  {c.delete}
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
              {c.carDetailsLink}
            </Link>
            {" · "}
            <Link href="/dashboard/cars" className="text-sky-400 hover:text-sky-300">
              {c.allCars}
            </Link>
          </p>
        </>
      ) : (
        <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-400">
          {c.selectVehiclePrompt}
        </p>
      )}
      {showFillupForm && selectedCarId ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/75 p-3 sm:p-6">
          <Link href={cancelEditHref} aria-label="Close fill-up form" className="absolute inset-0" />
          <section className="relative w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-lg shadow-slate-950/60 ring-1 ring-slate-700/80 sm:max-h-[calc(100dvh-3rem)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-slate-200">
                {editingFillup ? pp.editFillUp : pp.newFillUp}
              </h2>
              <Link
                href={cancelEditHref}
                className="inline-flex min-h-[36px] items-center justify-center rounded-md border border-slate-600 px-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                {c.cancel}
              </Link>
            </div>
            <form
              key={editingFillup?.id ?? "new-fillup"}
              action={editingFillup ? updatePrivateClinicPetrolFillup : createPrivateClinicPetrolFillup}
              className="flex flex-col gap-4"
            >
              <PetrolFillupDateTankerFields
                members={familyMembers}
                defaultFilledAt={editingFillup ? dateInputValue(editingFillup.filled_at) : today}
                defaultTankerId={editingFillup?.tanked_up_by_family_member_id ?? null}
                labels={{
                  date: c.date,
                  tankedUpBy: c.tankedBy,
                  select: pp.selectEllipsis,
                  tankerAgeHint: pp.tankerAgeHint,
                  tankerNoEligible: pp.tankerNoEligible,
                  tankerNoDob: pp.tankerNoDob,
                }}
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
                labels={{
                  amountPaid: pp.amountPaid,
                  litres: pp.litres,
                  costPerLitrePreview: pp.costPerLitrePreview,
                  odometerKm: pp.odometerKm,
                }}
              />
              <div className="[&_select]:min-h-[52px] [&_select]:text-base [&_select]:rounded-xl [&_select]:border-slate-600 [&_select]:bg-slate-800 [&_select]:px-4 [&_select]:py-3">
                <TherapyTransactionLinkSelect
                  name="linked_transaction_id"
                  householdId={householdId}
                  currentId={editingFillup?.transaction_id ?? null}
                  label={pp.linkTxOptional}
                  hint={pp.linkTxHint}
                  noneOptionLabel={c.txNoneLinked}
                />
              </div>
              <div className="space-y-2">
                <label className={labelClass} htmlFor="notes">
                  {pp.notesOptional}
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
                  {editingFillup ? pp.saveChanges : pp.saveFillUp}
                </button>
                <Link
                  href={cancelEditHref}
                  className="inline-flex min-h-[56px] items-center justify-center rounded-xl border border-slate-600 px-5 text-base font-medium text-slate-200 hover:bg-slate-800"
                >
                  {c.cancel}
                </Link>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
