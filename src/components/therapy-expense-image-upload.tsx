"use client";

import type { FormEvent } from "react";

export function TherapyExpenseImageUpload({ expenseId }: { expenseId: string }) {
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
      <input
        type="file"
        name="file"
        accept="image/*"
        required
        className="text-sm text-slate-300"
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
