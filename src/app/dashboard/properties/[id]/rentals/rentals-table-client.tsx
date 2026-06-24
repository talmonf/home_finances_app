"use client";

import { DashboardAddButton } from "@/components/dashboard-add-button";
import { useRouter } from "next/navigation";

export type RentalTableRow = {
  id: string;
  rentalTypeLabel: string;
  tenantNames: string;
  startDateLabel: string;
  endDateLabel: string;
  paymentLabel: string;
  paymentMethodLabel: string;
  isClinicLease: boolean;
};

type RentalsTableClientProps = {
  propertyId: string;
  rows: RentalTableRow[];
  selectedRentalId: string | null;
  addRentalHref: string;
};

export function RentalsTableClient({
  propertyId,
  rows,
  selectedRentalId,
  addRentalHref,
}: RentalsTableClientProps) {
  const router = useRouter();

  const selectRental = (rentalId: string) => {
    router.replace(`/dashboard/properties/${propertyId}/rentals?rentalId=${encodeURIComponent(rentalId)}`, {
      scroll: false,
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium text-slate-200">Rentals</h2>
        <DashboardAddButton href={addRentalHref} label="Add rental" />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 text-center text-sm text-slate-400">
          No rentals yet. Use <span className="text-slate-300">Add rental</span> to add one, then manage tenants,
          contracts, and transaction links in the details panel.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80">
                <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                <th className="px-4 py-3 font-medium text-slate-300">Tenants</th>
                <th className="px-4 py-3 font-medium text-slate-300">Start</th>
                <th className="px-4 py-3 font-medium text-slate-300">End</th>
                <th className="px-4 py-3 font-medium text-slate-300">Payment</th>
                <th className="px-4 py-3 font-medium text-slate-300">Payment method</th>
                <th className="px-4 py-3 font-medium text-slate-300">Clinic</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isSelected = row.id === selectedRentalId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => selectRental(row.id)}
                    className={`cursor-pointer border-b border-slate-700/80 hover:bg-slate-800/40 ${
                      isSelected ? "border-l-2 border-l-sky-400 bg-sky-950/40" : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-100">{row.rentalTypeLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.tenantNames}</td>
                    <td className="px-4 py-3 text-slate-300">{row.startDateLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.endDateLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.paymentLabel}</td>
                    <td className="px-4 py-3 text-slate-300">{row.paymentMethodLabel}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {row.isClinicLease ? (
                        <span className="rounded bg-violet-950/60 px-2 py-0.5 text-xs text-violet-300">Clinic</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
