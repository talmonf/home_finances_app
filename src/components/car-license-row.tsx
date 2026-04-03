"use client";

import { useState } from "react";
import { deleteCarLicense, updateCarLicense } from "@/app/dashboard/cars/actions";
import { CarLicenseReceiptUpload } from "@/components/car-license-receipt-upload";

type CardOpt = { id: string; label: string };

export type CarLicenseRowData = {
  id: string;
  renewedAt: string;
  expiresAt: string;
  costAmount: string;
  creditCardId: string;
  bankAccountId: string;
  notes: string;
  hasReceipt: boolean;
  paymentLabel: string;
};

export function CarLicenseRow({
  license,
  carId,
  creditCards,
  bankAccounts,
}: {
  license: CarLicenseRowData;
  carId: string;
  creditCards: CardOpt[];
  bankAccounts: CardOpt[];
}) {
  const [editing, setEditing] = useState(false);

  const field =
    "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

  return (
    <>
      <tr className="border-b border-slate-700/80">
        <td className="px-3 py-2 text-slate-300">{license.renewedAt ? license.renewedAt : "—"}</td>
        <td className="px-3 py-2 text-slate-200">{license.expiresAt || "—"}</td>
        <td className="px-3 py-2 text-slate-300">{license.costAmount ? license.costAmount : "—"}</td>
        <td className="px-3 py-2 text-slate-300">{license.paymentLabel}</td>
        <td className="max-w-[14rem] px-3 py-2 align-top text-slate-300">
          {license.hasReceipt ? (
            <div className="space-y-2">
              <a
                href={`/api/cars/licenses/${license.id}/download`}
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                Download
              </a>
              <CarLicenseReceiptUpload licenseId={license.id} hasReceipt />
            </div>
          ) : (
            <CarLicenseReceiptUpload licenseId={license.id} />
          )}
        </td>
        <td className="px-3 py-2 text-slate-400">{license.notes || "—"}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            <form action={deleteCarLicense.bind(null, license.id, carId)} className="inline">
              <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                Delete
              </button>
            </form>
          </div>
        </td>
      </tr>
      {editing ? (
        <tr className="border-b border-slate-700/80 bg-slate-800/30">
          <td colSpan={7} className="p-4">
            <form
              action={async (fd) => {
                await updateCarLicense(fd);
                setEditing(false);
              }}
              className="grid gap-3 md:grid-cols-3"
            >
              <input type="hidden" name="id" value={license.id} />
              <input type="hidden" name="car_id" value={carId} />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`renewed-${license.id}`}>
                  Renewal / payment date
                </label>
                <input
                  id={`renewed-${license.id}`}
                  name="renewed_at"
                  type="date"
                  defaultValue={license.renewedAt}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`expires-${license.id}`}>
                  Expires on
                </label>
                <input
                  id={`expires-${license.id}`}
                  name="expires_at"
                  type="date"
                  required
                  defaultValue={license.expiresAt}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`cost-${license.id}`}>
                  Cost
                </label>
                <input
                  id={`cost-${license.id}`}
                  name="cost_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={license.costAmount}
                  className={`w-full ${field}`}
                />
              </div>
              <select
                name="credit_card_id"
                defaultValue={license.creditCardId}
                className={field}
              >
                <option value="">Credit card (optional)</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                name="bank_account_id"
                defaultValue={license.bankAccountId}
                className={field}
              >
                <option value="">Bank account (optional)</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <input
                name="notes"
                placeholder="License notes"
                defaultValue={license.notes}
                className={`md:col-span-2 ${field}`}
              />
              <div className="flex flex-wrap items-center gap-3 md:col-span-3">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
