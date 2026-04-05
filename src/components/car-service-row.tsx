"use client";

import { useState } from "react";
import { deleteCarService, updateCarService } from "@/app/dashboard/cars/actions";
import { CarServiceAttachmentDeleteButton } from "@/components/car-service-attachment-delete";
import { CarServiceAttachmentUpload } from "@/components/car-service-attachment-upload";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { ProxiedFileOpenDownloadLinks } from "@/components/file-open-download-links";

type CardOpt = { id: string; label: string };

function formatServiceCostDisplay(raw: string): string {
  if (!raw?.trim()) return "—";
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) return raw;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIS`;
}

function formatServiceCostInputDefault(raw: string): string {
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  return Number.isFinite(n) ? n.toFixed(2) : raw;
}

export type CarServiceRowData = {
  id: string;
  servicedAt: string;
  nextServiceAt: string;
  providerName: string;
  costAmount: string;
  odometerKm: number | null;
  creditCardId: string;
  bankAccountId: string;
  notes: string;
  hasAttachment: boolean;
  paymentLabel: string;
};

export function CarServiceRow({
  service,
  carId,
  creditCards,
  bankAccounts,
}: {
  service: CarServiceRowData;
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
        <td className="px-3 py-2 text-slate-200">{service.servicedAt || "—"}</td>
        <td className="px-3 py-2 text-slate-300">{service.nextServiceAt || "—"}</td>
        <td className="px-3 py-2 text-slate-300">{service.providerName}</td>
        <td className="px-3 py-2 text-slate-300 tabular-nums">{formatServiceCostDisplay(service.costAmount)}</td>
        <td className="px-3 py-2 text-slate-300">{service.odometerKm ?? "—"}</td>
        <td className="px-3 py-2 text-slate-300">{service.paymentLabel}</td>
        <td className="max-w-[14rem] px-3 py-2 align-top text-slate-300">
          {service.hasAttachment ? (
            <ProxiedFileOpenDownloadLinks
              downloadApiPath={`/api/cars/services/${service.id}/download`}
            />
          ) : (
            <span className="text-xs text-slate-500">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-slate-400">{service.notes || "—"}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            <ConfirmDeleteForm action={deleteCarService.bind(null, service.id, carId)} className="inline">
              <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
                Delete
              </button>
            </ConfirmDeleteForm>
          </div>
        </td>
      </tr>
      {editing ? (
        <tr className="border-b border-slate-700/80 bg-slate-800/30">
          <td colSpan={9} className="p-4">
            <form
              action={async (fd) => {
                await updateCarService(fd);
                setEditing(false);
              }}
              className="grid gap-3 md:grid-cols-3"
            >
              <input type="hidden" name="id" value={service.id} />
              <input type="hidden" name="car_id" value={carId} />
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`svc-at-${service.id}`}>
                  Service date
                </label>
                <input
                  id={`svc-at-${service.id}`}
                  name="serviced_at"
                  type="date"
                  required
                  defaultValue={service.servicedAt}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`next-svc-${service.id}`}>
                  Next service date (optional)
                </label>
                <input
                  id={`next-svc-${service.id}`}
                  name="next_service_at"
                  type="date"
                  defaultValue={service.nextServiceAt}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`provider-${service.id}`}>
                  Provider / location
                </label>
                <input
                  id={`provider-${service.id}`}
                  name="provider_name"
                  required
                  defaultValue={service.providerName}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`cost-${service.id}`}>
                  Cost
                </label>
                <input
                  id={`cost-${service.id}`}
                  name="cost_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={formatServiceCostInputDefault(service.costAmount)}
                  className={`w-full ${field}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-300" htmlFor={`odo-${service.id}`}>
                  Odometer km
                </label>
                <input
                  id={`odo-${service.id}`}
                  name="odometer_km"
                  type="number"
                  min="0"
                  defaultValue={service.odometerKm ?? ""}
                  className={`w-full ${field}`}
                />
              </div>
              <select
                name="credit_card_id"
                defaultValue={service.creditCardId}
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
                defaultValue={service.bankAccountId}
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
                placeholder="Service notes"
                defaultValue={service.notes}
                className={`md:col-span-2 ${field}`}
              />
              <div className="space-y-3 md:col-span-3 rounded-lg border border-slate-600/80 bg-slate-900/30 p-3">
                <p className="text-xs font-medium text-slate-300">Service details file (optional)</p>
                <p className="text-xs text-slate-500">
                  PDF or image (invoice, work order, etc.). Stored securely with your household.
                </p>
                {service.hasAttachment ? (
                  <div className="space-y-4">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Current file</p>
                      <ProxiedFileOpenDownloadLinks
                        downloadApiPath={`/api/cars/services/${service.id}/download`}
                      />
                    </div>
                    <div className="border-t border-slate-700/80 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Remove file</p>
                      <p className="mb-2 text-xs text-slate-500">
                        Deletes the file from storage and clears it from this service record.
                      </p>
                      <CarServiceAttachmentDeleteButton serviceId={service.id} />
                    </div>
                    <div className="border-t border-slate-700/80 pt-3">
                      <p className="mb-1.5 text-xs font-medium text-slate-400">Replace with a new file</p>
                      <p className="mb-2 text-xs text-slate-500">
                        Choose a file below, then upload. The previous file is removed from storage first.
                      </p>
                      <CarServiceAttachmentUpload
                        serviceId={service.id}
                        hasAttachment
                        inputSuffix="-edit"
                        layout="stacked"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="mb-2 text-xs text-slate-500">Add a file after choosing it below.</p>
                    <CarServiceAttachmentUpload serviceId={service.id} inputSuffix="-edit" layout="stacked" />
                  </div>
                )}
              </div>
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
