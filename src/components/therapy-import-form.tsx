"use client";

import type { FormEvent } from "react";
import { useState } from "react";

type Locale = "en" | "he";

export function TherapyImportForm({
  locale = "en",
  labels,
}: {
  locale?: Locale;
  labels: {
    importWorkbook: string;
    importFailed: string;
    importedRows: (n: number, issues: number, errText: string) => string;
  };
}) {
  const [msg, setMsg] = useState<string | null>(null);

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
    setMsg(labels.importedRows(j.imported ?? 0, j.errorCount ?? 0, errText));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <input type="file" name="file" accept=".xlsx,.xls" required className="text-sm text-slate-300" />
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
