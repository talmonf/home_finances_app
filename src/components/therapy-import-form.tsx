"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";

type Locale = "en" | "he";

export function TherapyImportForm({
  locale = "en",
  labels,
}: {
  locale?: Locale;
  labels: {
    importWorkbook: string;
    importFailed: string;
  };
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/private-clinic/import", {
      method: "POST",
      body: fd,
    });
    const j = (await res.json()) as {
      ok?: boolean;
      imported?: number;
      errors?: string[];
      errorCount?: number;
      error?: string;
    };
    if (!res.ok) {
      setMsg(j.error || labels.importFailed);
      return;
    }
    const errText = j.errors?.length ? j.errors.join("; ") : "";
    const imported = j.imported ?? 0;
    const issues = j.errorCount ?? 0;
    const base =
      locale === "he"
        ? `יובאו ${imported} שורות. ${issues ? `${issues} בעיות. ` : ""}`
        : `Imported ${imported} row(s). ${issues ? `${issues} issue(s). ` : ""}`;
    setMsg(`${base}${errText}`);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <FileUploadField
        id="therapy-import-file"
        name="file"
        accept=".xlsx,.xls"
        required
        onFileChange={setFile}
        fileName={file?.name ?? null}
      />
      <button
        type="submit"
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {labels.importWorkbook}
      </button>
      {msg && <p className="text-sm text-slate-300 whitespace-pre-wrap">{msg}</p>}
    </form>
  );
}
