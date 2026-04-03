"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CarLicenseReceiptUpload({
  licenseId,
  hasReceipt = false,
}: {
  licenseId: string;
  hasReceipt?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cars/licenses/${licenseId}/receipt`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Upload failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <input type="file" name="file" required className="max-w-[200px] text-xs text-slate-200" />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-60"
      >
        {busy ? "…" : hasReceipt ? "Replace" : "Upload"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </form>
  );
}
