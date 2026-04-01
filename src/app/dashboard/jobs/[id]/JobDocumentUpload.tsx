"use client";

import { useState } from "react";

type Props = {
  jobId: string;
};

export default function JobDocumentUpload({ jobId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      formData.set("job_id", jobId);
      const res = await fetch("/api/jobs/documents/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        return;
      }
      window.location.reload();
    } catch {
      setError("Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="file" name="file" required className="max-w-[230px] text-xs text-slate-200" />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {busy ? "Uploading..." : "Upload document"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </form>
  );
}
