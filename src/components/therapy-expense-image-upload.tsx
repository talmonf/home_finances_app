"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";

export function TherapyExpenseImageUpload({ expenseId }: { expenseId: string }) {
  const [file, setFile] = useState<File | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/private-clinic/expense-image", {
      method: "POST",
      body: fd,
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert((j as { error?: string }).error || "Upload failed");
    }
  }

  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={onSubmit}>
      <input type="hidden" name="expense_id" value={expenseId} />
      <FileUploadField
        id={`therapy-expense-file-${expenseId}`}
        name="file"
        accept="image/*"
        required
        onFileChange={setFile}
        fileName={file?.name ?? null}
      />
      <button
        type="submit"
        className="rounded bg-slate-700 px-3 py-1 text-xs text-slate-100 hover:bg-slate-600"
      >
        Upload image
      </button>
    </form>
  );
}
