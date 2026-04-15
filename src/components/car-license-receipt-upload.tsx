"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";

/** Div + button upload so this works inside the license edit form (no nested form). */
export function CarLicenseReceiptUpload({
  licenseId,
  hasReceipt = false,
  /** Disambiguate id when two uploaders exist for the same license (table row + edit panel). */
  inputSuffix = "",
  /** `stacked`: file input on one line, button on the next (clearer in edit panels). */
  layout = "inline",
}: {
  licenseId: string;
  hasReceipt?: boolean;
  inputSuffix?: string;
  layout?: "inline" | "stacked";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const upload = useCallback(async () => {
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
      setFile(null);
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }, [file, licenseId, router]);

  const inputId = `car-license-receipt-file-${licenseId}${inputSuffix}`;

  const rowClass =
    layout === "stacked"
      ? "flex flex-col items-stretch gap-2"
      : "flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2";

  return (
    <div className={rowClass}>
      <FileUploadField
        id={inputId}
        onFileChange={setFile}
        fileName={file?.name ?? null}
        className={
          layout === "stacked"
            ? "w-full max-w-md flex flex-wrap items-center gap-2"
            : "max-w-[320px] flex flex-wrap items-center gap-2"
        }
        textClassName="max-w-[180px] truncate text-xs text-slate-200"
      />
      <button
        type="button"
        onClick={upload}
        disabled={busy}
        className="w-fit rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-60"
      >
        {busy
          ? "Uploading…"
          : hasReceipt
            ? "Upload and replace in storage"
            : "Upload"}
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
