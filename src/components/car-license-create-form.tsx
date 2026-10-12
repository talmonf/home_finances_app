"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";
import { HouseholdDateField } from "@/components/household-date-field";
import { useObfuscateSensitive, useUiLanguage } from "@/components/household-preferences-context";
import { maskSensitiveText } from "@/lib/privacy-display";

type Card = { id: string; label: string };
type Account = { id: string; label: string };

export function CarLicenseCreateForm({
  carId,
  creditCards,
  bankAccounts,
  onSaved,
  onCancel,
}: {
  carId: string;
  creditCards: Card[];
  bankAccounts: Account[];
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [formKey, setFormKey] = useState(0);
  const isHebrew = useUiLanguage() === "he";
  const obfuscate = useObfuscateSensitive();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(form);
      const res = await fetch("/api/cars/licenses", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const text = await res.text();
      let serverMessage: string | undefined;
      try {
        const data = JSON.parse(text) as { error?: unknown };
        if (typeof data?.error === "string") serverMessage = data.error;
      } catch {
        if (text.trim()) serverMessage = text.trim().slice(0, 400);
      }
      if (!res.ok) {
        setError(
          serverMessage ??
            (res.status === 413
              ? "Request too large (try a smaller PDF or compress the file)."
              : `Could not save license (HTTP ${res.status}).`),
        );
        return;
      }
      setReceiptFile(null);
      setFormKey((key) => key + 1);
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

  const alignedField = "row-span-2 grid grid-rows-subgrid gap-y-1";

  return (
    <form
      key={formKey}
      onSubmit={onSubmit}
      data-skip-global-submit-feedback=""
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
    >
      <input type="hidden" name="car_id" value={carId} />
      <div className={alignedField}>
        <div>
          <label className="block text-xs font-medium text-slate-300" htmlFor="license-renewed-at">
            {isHebrew ? "תאריך חידוש / תשלום" : "Renewal / payment date"}
          </label>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {isHebrew ? "מתי שולם או חודש (אופציונלי)." : "When you paid or renewed (optional)."}
          </p>
        </div>
        <HouseholdDateField id="license-renewed-at" name="renewed_at" className={`w-full ${field}`} />
      </div>
      <div className={alignedField}>
        <div>
          <label className="block text-xs font-medium text-slate-300" htmlFor="license-expires-at">
            {isHebrew ? "תאריך תפוגה" : "Expires on"}
          </label>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            {isHebrew ? "סיום תקופת התוקף של הרישיון (חובה)." : "End of the license validity period (required)."}
          </p>
        </div>
        <HouseholdDateField
          id="license-expires-at"
          name="expires_at"
          required
          className={`w-full ${field}`}
        />
      </div>
      <div className={alignedField}>
        <label className="block text-xs font-medium text-slate-300" htmlFor="license-cost">
          {isHebrew ? "עלות" : "Cost"}
        </label>
        <input
          id="license-cost"
          name="cost_amount"
          type="number"
          step="0.01"
          min="0"
          placeholder={isHebrew ? "עלות" : "Cost"}
          className={`w-full self-start ${field}`}
        />
      </div>
      <select name="credit_card_id" className={field}>
        <option value="">{isHebrew ? "כרטיס אשראי (אופציונלי)" : "Credit card (optional)"}</option>
        {creditCards.map((c) => (
          <option key={c.id} value={c.id}>
            {maskSensitiveText(obfuscate, c.label)}
          </option>
        ))}
      </select>
      <select name="bank_account_id" className={field}>
        <option value="">{isHebrew ? "חשבון בנק (אופציונלי)" : "Bank account (optional)"}</option>
        {bankAccounts.map((b) => (
          <option key={b.id} value={b.id}>
            {maskSensitiveText(obfuscate, b.label)}
          </option>
        ))}
      </select>
      <div className="space-y-1 md:col-span-2">
        <label className="block text-xs font-medium text-slate-300" htmlFor="license-receipt">
          {isHebrew ? "קבלה/קובץ רישיון ששולם (אופציונלי)" : "Paid license receipt (optional)"}
        </label>
        <p className="mb-1 text-[11px] leading-snug text-slate-500">
          PDF or photo stored in your household S3 bucket (same credentials as job documents / rentals).
        </p>
        <FileUploadField
          id="license-receipt"
          name="receipt"
          accept="image/*,.pdf,application/pdf"
          onFileChange={setReceiptFile}
          fileName={receiptFile?.name ?? null}
          className="w-full"
          textClassName="max-w-full truncate text-sm text-slate-200"
        />
      </div>
      <input name="notes" placeholder={isHebrew ? "הערות רישיון" : "License notes"} className={`md:col-span-2 ${field}`} />
      <div className="flex flex-col gap-2 md:col-span-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {busy ? (isHebrew ? "שומר..." : "Saving…") : isHebrew ? "שמירה" : "Save"}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="text-sm text-slate-400 hover:text-slate-200 disabled:opacity-60"
            >
              {isHebrew ? "ביטול" : "Cancel"}
            </button>
          ) : null}
        </div>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    </form>
  );
}

export function CarLicenseAddButton({
  carId,
  creditCards,
  bankAccounts,
}: {
  carId: string;
  creditCards: Card[];
  bankAccounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const isHebrew = useUiLanguage() === "he";
  const titleId = useId();
  const title = isHebrew ? "הוספת רישיון" : "Add License";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {title}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id={titleId} className="text-lg font-medium text-slate-200">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={isHebrew ? "סגירה" : "Close"}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100"
              >
                <span aria-hidden="true" className="text-base leading-none">
                  ×
                </span>
              </button>
            </div>
            <CarLicenseCreateForm
              carId={carId}
              creditCards={creditCards}
              bankAccounts={bankAccounts}
              onSaved={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
