import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
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
import { createCarPetrolFillup, deleteCarPetrolFillup, updateCarPetrolFillup } from "@/app/dashboard/cars/actions";
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
    /** Fill-up id to edit */
    edit?: string;
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

export default async function PetrolFillupsPage({ searchParams }: PageProps) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const resolved = searchParams ? await searchParams : {};
  const requestedCarId = resolved.carId?.trim() || null;
  const editFillupId = resolved.edit?.trim() || null;

  const cars = await prisma.cars.findMany({
    where: { household_id: householdId, is_active: true },
    orderBy: [{ maker: "asc" }, { model: "asc" }],
  });

  const carOptions = cars.map((c) => ({ id: c.id, label: carDisplayLabel(c) }));

  const selectedCarId =
    requestedCarId && cars.some((c) => c.id === requestedCarId) ? requestedCarId : null;

  if (cars.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <Link href="/" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">Petrol fill-ups</h1>
          <p className="text-sm text-slate-400">Add a vehicle first, then you can log fill-ups here.</p>
          <Link
            href="/dashboard/cars"
            className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-sky-500 px-5 text-base font-semibold text-slate-950 hover:bg-sky-400"
          >
            Go to Cars
          </Link>
        </div>
      </div>
    );
  }

  if (cars.length === 1) {
    const onlyId = cars[0].id;
    if (selectedCarId !== onlyId) {
      const p = new URLSearchParams();
      p.set("carId", onlyId);
      if (resolved.saved) p.set("saved", typeof resolved.saved === "string" ? resolved.saved : "1");
      if (resolved.deleted) p.set("deleted", typeof resolved.deleted === "string" ? resolved.deleted : "1");
      if (resolved.error) p.set("error", resolved.error);
      p.delete("edit");
      redirect(`/dashboard/petrol-fillups?${p.toString()}`);
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

  const cancelEditHref =
    selectedCarId != null
      ? `/dashboard/petrol-fillups?carId=${encodeURIComponent(selectedCarId)}`
      : "/dashboard/petrol-fillups";

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-28 pt-6 sm:pb-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <Link href="/" className="inline-block text-sm text-slate-400 hover:text-slate-200">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Petrol fill-up</h1>
          <p className="text-sm text-slate-400">
            Choose the car, then enter the pump readout. Δ km and km/L use the previous fill with a lower odometer.
          </p>
        </header>

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
                action={editingFillup ? updateCarPetrolFillup : createCarPetrolFillup}
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
                <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/40">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-800/80">
                        <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Date</th>
                        <th className="min-w-[7rem] px-3 py-2 font-medium text-slate-300">Tanked by</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Paid</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">L</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Odo (km)</th>
                        <th className="whitespace-nowrap px-3 py-2 font-medium text-slate-300">Δ km</th>
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
                        const editHref = `/dashboard/petrol-fillups?carId=${encodeURIComponent(selectedCarId)}&edit=${encodeURIComponent(p.id)}`;
                        return (
                          <tr
                            key={p.id}
                            className={`border-b border-slate-700/80 ${editingFillup?.id === p.id ? "bg-sky-950/40" : ""}`}
                          >
                            <td className="whitespace-nowrap px-3 py-2 text-slate-200">{dateInputValue(p.filled_at)}</td>
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
                            <td className="whitespace-nowrap px-3 py-2 text-slate-400" title={tx ? `${dateInputValue(tx.transaction_date)} ${tx.amount.toString()}` : undefined}>
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
                                <ConfirmDeleteForm action={deleteCarPetrolFillup.bind(null, p.id, selectedCarId)}>
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
    </div>
  );
}
