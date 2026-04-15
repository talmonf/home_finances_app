"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUploadField } from "@/components/file-upload-field";

type BankAccount = { id: string; account_name: string };

export function ImportUploadForm({
  bankAccounts,
  uiLanguage = "en",
}: {
  bankAccounts: BankAccount[];
  uiLanguage?: "en" | "he";
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [bankAccountId, setBankAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHebrew = uiLanguage === "he";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      if (bankAccountId) formData.set("bank_account_id", bankAccountId);

      const res = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Upload failed");
        setLoading(false);
        return;
      }

      if (data.documentId) {
        router.push(`/dashboard/import/review/${data.documentId}`);
        return;
      }
      setError("Unexpected response");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <h2 className="text-lg font-medium text-slate-200">Upload file</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            {isHebrew ? "חשבון בנק (אופציונלי)" : "Bank account (optional)"}
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => setBankAccountId(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">— None —</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            {isHebrew ? "קובץ PDF או Excel" : "PDF or Excel file"}
          </label>
          <FileUploadField
            id="import-upload-file"
            accept=".pdf,.xlsx,.xls"
            onFileChange={setFile}
            fileName={file?.name ?? null}
            buttonLabel={isHebrew ? "בחירת קובץ" : "Choose file"}
            noFileText={isHebrew ? "לא נבחר קובץ" : "No file selected"}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2"
            buttonClassName="inline-flex cursor-pointer rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-500"
            textClassName="max-w-full truncate text-sm text-slate-200"
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-rose-400">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
      >
        {loading ? (isHebrew ? "מעלה..." : "Uploading…") : isHebrew ? "העלאה וחילוץ" : "Upload and extract"}
      </button>
    </form>
  );
}
