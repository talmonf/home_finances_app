"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { RiseUpAnalyzedRow } from "@/lib/riseup-matching";
import type { RiseUpCommitRowPayload } from "@/lib/riseup-commit-types";

type Props = {
  uiLanguage: "en" | "he";
  bankAccounts: { id: string; label: string }[];
  creditCards: { id: string; label: string }[];
};

function buildCommitPayload(
  rows: RiseUpAnalyzedRow[],
  overrides: Record<
    number,
    {
      bank_account_id: string | null;
      credit_card_id: string | null;
      payee_id: string | null;
      new_payee_name: string;
      category_id: string | null;
      job_id: string | null;
      subscription_id: string | null;
      loan_id: string | null;
    }
  >,
): RiseUpCommitRowPayload[] {
  return rows.map((r) => {
    const o = overrides[r.rowIndex];
    return {
      rowIndex: r.rowIndex,
      businessName: r.businessName,
      paymentDate: r.paymentDate,
      chargeDate: r.chargeDate,
      amount: r.amount,
      originalAmount: r.originalAmount,
      sourceKind: String(r.sourceKind),
      cashflowCategory: r.cashflowCategory,
      isZeroAmountPending: r.isZeroAmountPending,
      raw: r.raw,
      bank_account_id: o.bank_account_id,
      credit_card_id: o.credit_card_id,
      payee_id: o.payee_id || null,
      new_payee_name: o.new_payee_name?.trim() || null,
      category_id: o.category_id,
      job_id: o.job_id,
      subscription_id: o.subscription_id,
      loan_id: o.loan_id,
    };
  });
}

function instrumentValue(o: {
  bank_account_id: string | null;
  credit_card_id: string | null;
}): string {
  if (o.bank_account_id) return `bank:${o.bank_account_id}`;
  if (o.credit_card_id) return `card:${o.credit_card_id}`;
  return "";
}

export function RiseUpImportFlow({ uiLanguage, bankAccounts, creditCards }: Props) {
  const router = useRouter();
  const isHe = uiLanguage === "he";
  const [file, setFile] = useState<File | null>(null);
  const [analyzed, setAnalyzed] = useState<RiseUpAnalyzedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<
    Record<
      number,
      {
        bank_account_id: string | null;
        credit_card_id: string | null;
        payee_id: string | null;
        new_payee_name: string;
        category_id: string | null;
        job_id: string | null;
        subscription_id: string | null;
        loan_id: string | null;
      }
    >
  >({});

  const initOverrides = (rows: RiseUpAnalyzedRow[]) => {
    const next: typeof overrides = {};
    for (const r of rows) {
      const bank =
        r.instrument.kind === "bank_account" ? r.instrument.selectedId : null;
      const card =
        r.instrument.kind === "credit_card" ? r.instrument.selectedId : null;
      next[r.rowIndex] = {
        bank_account_id: bank,
        credit_card_id: card,
        payee_id: r.payee.selectedId,
        new_payee_name: "",
        category_id: r.category.selectedId,
        job_id: r.job.selectedId,
        subscription_id: r.subscription.selectedId,
        loan_id: r.loan.selectedId,
      };
    }
    setOverrides(next);
  };

  async function analyze() {
    if (!file) {
      setError(isHe ? "נא לבחור קובץ CSV" : "Please choose a CSV file");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/import/riseup/analyze", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Analyze failed");
        setLoading(false);
        return;
      }
      const rows = data.rows as RiseUpAnalyzedRow[];
      setAnalyzed(rows);
      setFileName(data.fileName ?? file.name);
      initOverrides(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyze failed");
    }
    setLoading(false);
  }

  async function commit() {
    if (!analyzed || !fileName) return;
    setCommitting(true);
    setError(null);
    try {
      const rows = buildCommitPayload(analyzed, overrides);
      const res = await fetch("/api/import/riseup/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Commit failed");
        setCommitting(false);
        return;
      }
      setAnalyzed(null);
      setFile(null);
      setFileName(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    }
    setCommitting(false);
  }

  const uncertainCount = useMemo(
    () => (analyzed ? analyzed.filter((r) => r.needsReview).length : 0),
    [analyzed],
  );

  function setO(
    rowIndex: number,
    patch: Partial<(typeof overrides)[number]>,
  ) {
    setOverrides((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], ...patch },
    }));
  }

  return (
    <div className="space-y-4 rounded-xl border border-violet-800/60 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-slate-200">
            {isHe ? "ייבוא RiseUp (CSV)" : "RiseUp import (CSV)"}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {isHe
              ? "ייצוא מ-RiseUp: נתח את הקובץ, בדוק התאמות, ואשר לפני שמירה."
              : "Export from RiseUp: analyze the file, review matches, then confirm to save."}
          </p>
        </div>
      </div>

      {!analyzed ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              {isHe ? "קובץ CSV" : "CSV file"}
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="block text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => void analyze()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-60"
          >
            {loading ? (isHe ? "מנתח…" : "Analyzing…") : isHe ? "נתח קובץ" : "Analyze file"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
            <span>
              {fileName} — {analyzed.length}{" "}
              {isHe ? "שורות" : "rows"}
              {uncertainCount > 0 ? (
                <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-amber-200">
                  {uncertainCount} {isHe ? "דורשות בדיקה" : "need review"}
                </span>
              ) : (
                <span className="ml-2 text-emerald-400">
                  {isHe ? "התאמות בטוחות" : "Mostly high-confidence"}
                </span>
              )}
            </span>
            <button
              type="button"
              className="text-xs text-slate-400 underline hover:text-slate-200"
              onClick={() => {
                setAnalyzed(null);
                setFile(null);
                setFileName(null);
              }}
            >
              {isHe ? "התחל מחדש" : "Start over"}
            </button>
          </div>

          <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border border-slate-700">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-800 text-slate-300">
                <tr>
                  <th className="border-b border-slate-600 px-2 py-2">#</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "תאריך" : "Date"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "עסק" : "Merchant"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "סכום" : "Amount"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "מכשיר" : "Instrument"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "משלם" : "Payee"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "קטגוריה" : "Category"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "משרה" : "Job"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "מנוי" : "Subscription"}</th>
                  <th className="border-b border-slate-600 px-2 py-2">{isHe ? "הלוואה?" : "Loan?"}</th>
                </tr>
              </thead>
              <tbody>
                {analyzed.map((r) => {
                  const o = overrides[r.rowIndex];
                  if (!o) return null;
                  const instLabel =
                    r.instrument.kind === "bank_account"
                      ? isHe
                        ? "חשבון"
                        : "Account"
                      : r.instrument.kind === "credit_card"
                        ? isHe
                          ? "כרטיס"
                          : "Card"
                        : "?";
                  return (
                    <tr
                      key={r.rowIndex}
                      className={
                        r.needsReview
                          ? "bg-amber-950/40"
                          : "bg-slate-900/40"
                      }
                    >
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top text-slate-500">
                        {r.rowIndex + 1}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top whitespace-nowrap text-slate-200">
                        {r.paymentDate}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top text-slate-200">
                        {r.businessName}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top font-mono text-slate-200">
                        {r.amount.toFixed(2)}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <div className="text-[10px] text-slate-500">{instLabel}</div>
                        <select
                          className="mt-0.5 max-w-[220px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={instrumentValue(o)}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (!v) {
                              setO(r.rowIndex, { bank_account_id: null, credit_card_id: null });
                              return;
                            }
                            if (v.startsWith("bank:")) {
                              setO(r.rowIndex, {
                                bank_account_id: v.slice(5),
                                credit_card_id: null,
                              });
                            } else if (v.startsWith("card:")) {
                              setO(r.rowIndex, {
                                credit_card_id: v.slice(5),
                                bank_account_id: null,
                              });
                            }
                          }}
                        >
                          <option value="">—</option>
                          {r.instrument.kind === "unknown" ? (
                            <>
                              <optgroup label={isHe ? "חשבונות בנק" : "Bank accounts"}>
                                {bankAccounts.map((b) => (
                                  <option key={`b-${b.id}`} value={`bank:${b.id}`}>
                                    {b.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label={isHe ? "כרטיסי אשראי" : "Credit cards"}>
                                {creditCards.map((c) => (
                                  <option key={`c-${c.id}`} value={`card:${c.id}`}>
                                    {c.label}
                                  </option>
                                ))}
                              </optgroup>
                            </>
                          ) : r.instrument.kind === "bank_account" ? (
                            (r.instrument.candidates.length
                              ? r.instrument.candidates
                              : bankAccounts.map((b) => ({
                                  id: b.id,
                                  label: b.label,
                                  score: 0,
                                  confidence: "low" as const,
                                }))
                            ).map((c) => (
                              <option key={c.id} value={`bank:${c.id}`}>
                                {c.label} ({c.confidence})
                              </option>
                            ))
                          ) : (
                            (r.instrument.candidates.length
                              ? r.instrument.candidates
                              : creditCards.map((b) => ({
                                  id: b.id,
                                  label: b.label,
                                  score: 0,
                                  confidence: "low" as const,
                                }))
                            ).map((c) => (
                              <option key={c.id} value={`card:${c.id}`}>
                                {c.label} ({c.confidence})
                              </option>
                            ))
                          )}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.payee_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, {
                              payee_id: e.target.value || null,
                              new_payee_name: "",
                            })
                          }
                        >
                          <option value="">{isHe ? "(חדש)" : "(new)"}</option>
                          {r.payee.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {!o.payee_id ? (
                          <input
                            className="mt-1 w-full max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                            placeholder={isHe ? "שם משלם חדש" : "New payee name"}
                            value={o.new_payee_name}
                            onChange={(e) =>
                              setO(r.rowIndex, { new_payee_name: e.target.value })
                            }
                          />
                        ) : null}
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[160px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.category_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { category_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.category.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.job_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { job_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.job.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[180px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.subscription_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { subscription_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.subscription.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border-b border-slate-800 px-2 py-1.5 align-top">
                        <select
                          className="max-w-[160px] rounded border border-slate-600 bg-slate-800 px-1 py-1 text-slate-100"
                          value={o.loan_id ?? ""}
                          onChange={(e) =>
                            setO(r.rowIndex, { loan_id: e.target.value || null })
                          }
                        >
                          <option value="">—</option>
                          {r.loan.candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={committing}
            onClick={() => void commit()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {committing
              ? isHe
                ? "שומר…"
                : "Saving…"
              : isHe
                ? "אשר ושמור תנועות"
                : "Confirm and save transactions"}
          </button>
        </>
      )}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
    </div>
  );
}
