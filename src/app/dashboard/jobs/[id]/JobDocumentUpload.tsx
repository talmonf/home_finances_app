"use client";

import { useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";
import { useUiLanguage } from "@/components/household-preferences-context";

type Props = {
  jobId: string;
};

export default function JobDocumentUpload({ jobId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const isHebrew = useUiLanguage() === "he";

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
        setError(data?.error ?? (isHebrew ? "העלאה נכשלה" : "Upload failed"));
        return;
      }
      window.location.reload();
    } catch {
      setError(isHebrew ? "העלאה נכשלה" : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-wrap items-center gap-2">
      <FileUploadField
        id={`job-document-file-${jobId}`}
        name="file"
        required
        onFileChange={setFile}
        fileName={file?.name ?? null}
        buttonLabel={isHebrew ? "בחירת קובץ" : "Choose file"}
        noFileText={isHebrew ? "לא נבחר קובץ" : "No file selected"}
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-sky-600 px-2 py-1 text-xs text-white hover:bg-sky-500 disabled:opacity-60"
      >
        {busy ? (isHebrew ? "מעלה..." : "Uploading...") : isHebrew ? "העלאת מסמך" : "Upload document"}
      </button>
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </form>
  );
}
