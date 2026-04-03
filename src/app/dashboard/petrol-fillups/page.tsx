import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { carDisplayLabel, petrolMetricsByFillupId } from "@/lib/petrol-fillups-metrics";
import { PetrolCarPicker } from "@/components/petrol-car-picker";
import { TherapyTransactionLinkSelect } from "@/components/therapy-transaction-link-select";
import { createCarPetrolFillup, deleteCarPetrolFillup } from "@/app/dashboard/cars/actions";
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
      redirect(`/dashboard/petrol-fillups?${p.toString()}`);
    }
  }

  const fillups =
    selectedCarId != null
      ? await prisma.car_petrol_fillups.findMany({
          where: { household_id: householdId, car_id: selectedCarId },
          include: { transaction: true },
          orderBy: { filled_at: "desc" },
        })
      : [];

  const petrolMetrics = petrolMetricsByFillupId(fillups);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-28 pt-6 sm:pb-10">
      <div className="mx-auto w-full max-w-lg space-y-6">
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
            <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/50 ring-1 ring-slate-700/80">
              <h2 className="mb-4 text-lg font-medium text-slate-200">New fill-up</h2>
              <form action={createCarPetrolFillup} className="flex flex-col gap-4">
                <input type="hidden" name="car_id" value={selectedCarId} />
                <div className="space-y-2">
                  <label className={labelClass} htmlFor="filled_at">
                    Date
                  </label>
                  <input
                    id="filled_at"
                    name="filled_at"
                    type="date"
                    required
                    defaultValue={today}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass} htmlFor="amount_paid">
                    Amount paid
                  </label>
                  <input
                    id="amount_paid"
                    name="amount_paid"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    className={inputClass}
                    autoComplete="transaction-amount"
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass} htmlFor="litres">
                    Litres
                  </label>
                  <input
                    id="litres"
                    name="litres"
                    type="number"
                    inputMode="decimal"
                    step="0.001"
                    min="0"
                    required
                    placeholder="0.000"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className={labelClass} htmlFor="odometer_km">
                    Odometer (km)
                  </label>
                  <input
                    id="odometer_km"
                    name="odometer_km"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    required
                    className={inputClass}
                  />
                </div>
                <div className="[&_select]:min-h-[52px] [&_select]:text-base [&_select]:rounded-xl [&_select]:border-slate-600 [&_select]:bg-slate-800 [&_select]:px-4 [&_select]:py-3">
                  <TherapyTransactionLinkSelect
                    name="linked_transaction_id"
                    householdId={householdId}
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
                    className={`${inputClass} min-h-[88px] resize-y py-3`}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 min-h-[56px] w-full rounded-xl bg-sky-500 text-base font-semibold text-slate-950 shadow-md shadow-sky-900/30 hover:bg-sky-400 active:bg-sky-500"
                >
                  Save fill-up
                </button>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium text-slate-200">Recent fill-ups</h2>
              {fillups.length === 0 ? (
                <p className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-6 text-center text-sm text-slate-500">
                  No fill-ups for this vehicle yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {fillups.map((p) => {
                    const m = petrolMetrics.get(p.id);
                    const tx = p.transaction;
                    const txLabel = tx
                      ? `${dateInputValue(tx.transaction_date)} ${tx.transaction_direction === "credit" ? "+" : "−"}${tx.amount.toString()} ${tx.description ?? ""}`.slice(
                          0,
                          100,
                        )
                      : null;
                    return (
                      <li
                        key={p.id}
                        className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 shadow-sm ring-1 ring-slate-800"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-base font-medium text-slate-100">
                            {dateInputValue(p.filled_at)}
                          </p>
                          <form action={deleteCarPetrolFillup.bind(null, p.id, selectedCarId)}>
                            <button
                              type="submit"
                              className="min-h-[44px] min-w-[44px] rounded-lg px-3 text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                          <dt className="text-slate-500">Paid</dt>
                          <dd className="text-right text-slate-200">{formatMoney(p.amount_paid)}</dd>
                          <dt className="text-slate-500">Litres</dt>
                          <dd className="text-right text-slate-200">
                            {Number(p.litres.toString()).toLocaleString("en", {
                              minimumFractionDigits: 3,
                              maximumFractionDigits: 3,
                            })}
                          </dd>
                          <dt className="text-slate-500">Odometer</dt>
                          <dd className="text-right text-slate-200">
                            {p.odometer_km.toLocaleString("en")} km
                          </dd>
                          <dt className="text-slate-500">Δ km</dt>
                          <dd className="text-right text-slate-200">
                            {m?.deltaKm != null ? m.deltaKm.toLocaleString("en") : "—"}
                          </dd>
                          <dt className="text-slate-500">Cost / L</dt>
                          <dd className="text-right text-slate-200">
                            {m?.costPerLitre != null ? m.costPerLitre.toFixed(3) : "—"}
                          </dd>
                          <dt className="text-slate-500">km / L</dt>
                          <dd className="text-right text-slate-200">
                            {m?.kmPerLitre != null ? m.kmPerLitre.toFixed(2) : "—"}
                          </dd>
                        </dl>
                        {txLabel ? (
                          <p className="mt-3 border-t border-slate-700/80 pt-3 text-xs text-slate-500">
                            {txLabel}
                          </p>
                        ) : null}
                        {p.notes ? (
                          <p className="mt-2 text-xs text-slate-400">{p.notes}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
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
