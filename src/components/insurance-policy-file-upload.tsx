"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";

export function InsurancePolicyFileUpload({
  policyId,
  hasFile = false,
  labels,
}: {
  policyId: string;
  hasFile?: boolean;
  labels: {
    upload: string;
    uploading: string;
    replace: string;
    chooseFile: string;
    error: string;
    done: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const upload = useCallback(async () => {
    if (!file || file.size === 0) {
      setError(labels.chooseFile);
      setSuccess(false);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/insurance-policies/${policyId}/policy-file`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : labels.error);
        return;
      }
      setSuccess(true);
      setFile(null);
      router.refresh();
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }, [file, policyId, router, labels]);

  const inputId = `insurance-policy-file-${policyId}`;

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      <FileUploadField
        id={inputId}
        onFileChange={setFile}
        fileName={file?.name ?? null}
        className="max-w-[min(100%,340px)] flex flex-wrap items-center gap-2"
        textClassName="max-w-[180px] truncate text-xs text-slate-200"
      />
      <button
        type="button"
        onClick={upload}
        disabled={busy}
        className="w-fit rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-600 disabled:opacity-60"
      >
        {busy ? labels.uploading : hasFile ? labels.replace : labels.upload}
      </button>
      {error ? (
        <span id={`${inputId}-err`} className="text-xs text-rose-300" role="alert">
          {error}
        </span>
      ) : null}
      {success ? (
        <span id={`${inputId}-ok`} className="text-xs text-emerald-300">
          {labels.done}
        </span>
      ) : null}
    </div>
  );
}
