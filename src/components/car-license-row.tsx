"use client";

import { useState } from "react";
import { deleteCarLicense, updateCarLicense } from "@/app/dashboard/cars/actions";
import { CarLicenseReceiptDeleteButton } from "@/components/car-license-receipt-delete";
import { CarLicenseReceiptUpload } from "@/components/car-license-receipt-upload";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { ProxiedFileOpenDownloadLinks } from "@/components/file-open-download-links";
import { useHouseholdDateFormat, useUiLanguage } from "@/components/household-preferences-context";
import { formatIsoDateStringForHousehold } from "@/lib/household-date-format";

type CardOpt = { id: string; label: string };

function formatLicenseCostDisplay(raw: string): string {
  if (!raw?.trim()) return "—";
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIS`;
}

function formatLicenseCostInputDefault(raw: string): string {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : raw;
}

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
  const dateFmt = useHouseholdDateFormat();
  const isHebrew = useUiLanguage() === "he";

  const field =
    "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

  return (
    <>
      <tr className="border-b border-slate-700/80">
        <td className="px-3 py-2 text-slate-300">
          {license.renewedAt ? formatIsoDateStringForHousehold(license.renewedAt, dateFmt) : "—"}
        </td>
        <td className="px-3 py-2 text-slate-200">
          {license.expiresAt ? formatIsoDateStringForHousehold(license.expiresAt, dateFmt) : "—"}
        </td>
        <td className="px-3 py-2 text-slate-300 tabular-nums">{formatLicenseCostDisplay(license.costAmount)}</td>
        <td className="px-3 py-2 text-slate-300">{license.paymentLabel}</td>
        <td className="max-w-[14rem] px-3 py-2 align-top text-slate-300">
          {license.hasReceipt ? (
            <ProxiedFileOpenDownloadLinks
              downloadApiPath={`/api/cars/licenses/${license.id}/download`}
            />
          ) : (
            <span className="text-xs text-slate-500">—</span>
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
              {editing ? (isHebrew ? "ביטול" : "Cancel") : isHebrew ? "עריכה" : "Edit"}
            </button>
            <ConfirmDeleteForm action={deleteCarLicense.bind(null, license.id, carId)} className="inline">
              <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                {isHebrew ? "מחיקה" : "Delete"}
              </button>
            </ConfirmDeleteForm>
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
                  {isHebrew ? "תאריך חידוש / תשלום" : "Renewal / payment date"}
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
                  {isHebrew ? "תאריך תפוגה" : "Expires on"}
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
                  {isHebrew ? "עלות" : "Cost"}
                </label>
                <input
                  id={`cost-${license.id}`}
                  name="cost_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={formatLicenseCostInputDefault(license.costAmount)}
                  className={`w-full ${field}`}
                />
              </div>
              <select
                name="credit_card_id"
                defaultValue={license.creditCardId}
                className={field}
              >
                <option value="">{isHebrew ? "כרטיס אשראי (אופציונלי)" : "Credit card (optional)"}</option>
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
                <option value="">{isHebrew ? "חשבון בנק (אופציונלי)" : "Bank account (optional)"}</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <input
                name="notes"
                placeholder={isHebrew ? "הערות רישיון" : "License notes"}
                defaultValue={license.notes}
                className={`md:col-span-2 ${field}`}
              />
              <div className="space-y-3 md:col-span-3 rounded-lg border border-slate-600/80 bg-slate-900/30 p-3">
                <p className="text-xs font-medium text-slate-300">
                  {isHebrew ? "קובץ רישיון/קבלה (אופציונלי)" : "License receipt (optional)"}
                </p>
                <p className="text-xs text-slate-500">
                  PDF or image of the renewed license. Stored securely with your household.
                </p>
                {license.hasReceipt ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Current file</p>
                      <ProxiedFileOpenDownloadLinks
                        downloadApiPath={`/api/cars/licenses/${license.id}/download`}
                      />
                    </div>
                    <div className="border-t border-slate-700/80 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Remove receipt</p>
                      <p className="mb-2 text-xs text-slate-500">
                        Deletes the file from storage and clears it from this license.
                      </p>
                      <CarLicenseReceiptDeleteButton licenseId={license.id} />
                    </div>
                    <div className="border-t border-slate-700/80 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Replace with a new file</p>
                      <p className="mb-2 text-xs text-slate-500">
                        Choose a file below, then upload. The previous file is removed from storage first.
                      </p>
                      <CarLicenseReceiptUpload
                        licenseId={license.id}
                        hasReceipt
                        inputSuffix="-edit"
                        layout="stacked"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-xs text-slate-500">Add a receipt after choosing a file.</p>
                    <CarLicenseReceiptUpload licenseId={license.id} inputSuffix="-edit" layout="stacked" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 md:col-span-3">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {isHebrew ? "שמירת שינויים" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-sm text-slate-400 hover:text-slate-200"
                >
                  {isHebrew ? "ביטול" : "Cancel"}
                </button>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}
