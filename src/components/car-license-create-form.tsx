"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";
import { useUiLanguage } from "@/components/household-preferences-context";

type Card = { id: string; label: string };
type Account = { id: string; label: string };

export function CarLicenseCreateForm({
  carId,
  creditCards,
  bankAccounts,
}: {
  carId: string;
  creditCards: Card[];
  bankAccounts: Account[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const isHebrew = useUiLanguage() === "he";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
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
      e.currentTarget.reset();
      setReceiptFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="car_id" value={carId} />
      <div className="space-y-1 md:col-span-1">
        <label className="block text-xs font-medium text-slate-300" htmlFor="license-renewed-at">
          {isHebrew ? "תאריך חידוש / תשלום" : "Renewal / payment date"}
        </label>
        <p className="text-[11px] leading-snug text-slate-500">
          {isHebrew ? "מתי שולם או חודש (אופציונלי)." : "When you paid or renewed (optional)."}
        </p>
        <input id="license-renewed-at" name="renewed_at" type="date" className={`w-full ${field}`} />
      </div>
      <div className="space-y-1 md:col-span-1">
        <label className="block text-xs font-medium text-slate-300" htmlFor="license-expires-at">
          {isHebrew ? "תאריך תפוגה" : "Expires on"}
        </label>
        <p className="text-[11px] leading-snug text-slate-500">
          {isHebrew ? "סיום תקופת התוקף של הרישיון (חובה)." : "End of the license validity period (required)."}
        </p>
        <input id="license-expires-at" name="expires_at" type="date" required className={`w-full ${field}`} />
      </div>
      <div className="space-y-1 md:col-span-1">
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
          className={`w-full ${field}`}
        />
      </div>
      <select name="credit_card_id" className={field}>
        <option value="">{isHebrew ? "כרטיס אשראי (אופציונלי)" : "Credit card (optional)"}</option>
        {creditCards.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <select name="bank_account_id" className={field}>
        <option value="">{isHebrew ? "חשבון בנק (אופציונלי)" : "Bank account (optional)"}</option>
        {bankAccounts.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
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
        <button
          type="submit"
          disabled={busy}
          className="w-fit rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
        >
          {busy ? (isHebrew ? "שומר..." : "Saving…") : isHebrew ? "הוספת רישיון" : "Add license"}
        </button>
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      </div>
    </form>
  );
}
