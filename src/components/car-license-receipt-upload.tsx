"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

/** Div + button upload so this works inside the license edit form (no nested form). */
export function CarLicenseReceiptUpload({
  licenseId,
  hasReceipt = false,
  /** Disambiguate id when two uploaders exist for the same license (table row + edit panel). */
  inputSuffix = "",
}: {
  licenseId: string;
  hasReceipt?: boolean;
  inputSuffix?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const upload = useCallback(async () => {
    const file = inputRef.current?.files?.[0];
    if (!file || file.size === 0) {
      setError("Choose a file first.");
      setSuccess(false);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/cars/licenses/${licenseId}/receipt`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Upload failed");
        return;
      }
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }, [licenseId, router]);

  const inputId = `car-license-receipt-file-${licenseId}${inputSuffix}`;

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        className="max-w-[200px] text-xs text-slate-200"
        aria-describedby={error ? `${inputId}-err` : success ? `${inputId}-ok` : undefined}
      />
      <button
        type="button"
        onClick={upload}
        disabled={busy}
        className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-60"
      >
        {busy ? "Uploading…" : hasReceipt ? "Replace" : "Upload"}
      </button>
      {error ? (
        <span id={`${inputId}-err`} className="text-xs text-rose-300" role="alert">
          {error}
        </span>
      ) : null}
      {success ? (
        <span id={`${inputId}-ok`} className="text-xs text-emerald-300">
          Upload complete.
        </span>
      ) : null}
    </div>
  );
}
