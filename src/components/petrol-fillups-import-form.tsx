"use client";

/**
 * Petrol fill-up import: analyze (preview) then commit, same flow as
 * {@link TherapyTreatmentsImportForm} + `/api/private-clinic/import/tipulim`.
 */

import { LoadingSpinner } from "@/components/loading-spinner";
import type { PetrolFillupImportPreviewRow } from "@/lib/petrol-fillups-import";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API = "/api/petrol-fillups/import";

export type PetrolFillupsImportFormLabels = {
  chooseFile: string;
  instructions: string;
  analyze: string;
  confirm: string;
  clearPreview: string;
  previewTitle: string;
  /** Use `{count}` for the number of valid rows. */
  validRowsTemplate: string;
  rowIssuesTitle: string;
  fatalTitle: string;
  sheetLabel: string;
  sheetPickHint: string;
  workingAnalyze: string;
  workingCommit: string;
  sampleNote: string;
  commitBlocked: string;
  tableDate: string;
  tableAmount: string;
  tableLitres: string;
  tableOdo: string;
  tableNotes: string;
};

type PreviewState = {
  rowCount: number;
  rowErrors: string[];
  sampleRows: PetrolFillupImportPreviewRow[];
  canCommit: boolean;
  activeSheet: string;
  sheetNames: string[];
  sheetWarning: string | null;
};

export function PetrolFillupsImportForm({
  carId,
  variant,
  afterImportHref,
  labels,
}: {
  carId: string;
  variant: "household" | "private_clinic";
  /** Path + query for petrol list (e.g. `?carId=` already included). `imported=` is appended after success. */
  afterImportHref: string;
  labels: PetrolFillupsImportFormLabels;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [fatalErrors, setFatalErrors] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState<"preview" | "commit" | null>(null);

  function resetPreview() {
    setPreview(null);
    setFatalErrors(null);
    setMsg(null);
    setSheetName("");
  }

  async function post(mode: "preview" | "commit") {
    if (!file) {
      setMsg(labels.chooseFile);
      return;
    }
    setBusy(true);
    setBusyMode(mode);
    setMsg(null);
    setFatalErrors(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("car_id", carId);
    fd.append("variant", variant);
    fd.append("mode", mode);
    if (sheetName.trim()) fd.append("sheet_name", sheetName.trim());
    try {
      const res = await fetch(API, { method: "POST", body: fd });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        if (Array.isArray(data.fatalErrors)) {
          setFatalErrors(data.fatalErrors as string[]);
          setPreview(null);
          return;
        }
        if (data.error === "commit_blocked" && Array.isArray(data.rowErrors)) {
          setMsg(typeof data.message === "string" ? (data.message as string) : labels.commitBlocked);
          setPreview((prev) =>
            prev
              ? {
                  ...prev,
                  rowErrors: data.rowErrors as string[],
                  canCommit: false,
                }
              : null,
          );
          return;
        }
        setMsg(typeof data.error === "string" ? data.error : typeof data.message === "string" ? (data.message as string) : "Request failed");
        return;
      }
      if (mode === "preview") {
        const names = Array.isArray(data.sheetNames) ? (data.sheetNames as string[]) : [];
        const active = String(data.activeSheet ?? "");
        setSheetName(active);
        setPreview({
          rowCount: Number(data.rowCount) || 0,
          rowErrors: Array.isArray(data.rowErrors) ? (data.rowErrors as string[]) : [],
          sampleRows: Array.isArray(data.sampleRows) ? (data.sampleRows as PetrolFillupImportPreviewRow[]) : [],
          canCommit: Boolean(data.canCommit),
          activeSheet: active,
          sheetNames: names,
          sheetWarning: typeof data.sheetWarning === "string" ? data.sheetWarning : null,
        });
        return;
      }
      const imported = Number(data.imported);
      if (Number.isFinite(imported) && imported > 0) {
        const join = afterImportHref.includes("?") ? "&" : "?";
        router.push(`${afterImportHref}${join}imported=${encodeURIComponent(String(imported))}`);
      } else {
        setMsg("Import finished.");
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
      setBusyMode(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-sm text-slate-300">{labels.instructions}</p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300" htmlFor="petrol-import-file">
          {labels.chooseFile}
        </label>
        <input
          id="petrol-import-file"
          type="file"
          accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="block w-full text-sm text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-sky-500"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            resetPreview();
          }}
        />
      </div>

      {preview && preview.sheetNames.length > 1 ? (
        <label className="block text-sm text-slate-200">
          {labels.sheetLabel}
          <select
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            value={sheetName}
            onChange={(e) => {
              setSheetName(e.target.value);
              setPreview(null);
              setFatalErrors(null);
            }}
          >
            {preview.sheetNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-slate-500">{labels.sheetPickHint}</span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !file}
          onClick={() => post("preview")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy && busyMode === "preview" ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
          {labels.analyze}
        </button>
        <button
          type="button"
          disabled={busy || !preview?.canCommit}
          onClick={() => post("commit")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-sky-500 px-4 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-50"
        >
          {busy && busyMode === "commit" ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
          {labels.confirm}
        </button>
        {preview ? (
          <button
            type="button"
            disabled={busy}
            onClick={resetPreview}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {labels.clearPreview}
          </button>
        ) : null}
      </div>

      {busy ? (
        <p className="text-sm text-slate-400">
          {busyMode === "commit" ? labels.workingCommit : labels.workingAnalyze}
        </p>
      ) : null}

      {msg ? <p className="text-sm text-amber-200">{msg}</p> : null}

      {fatalErrors && fatalErrors.length > 0 ? (
        <div className="rounded-lg border border-rose-700/60 bg-rose-950/30 px-3 py-2">
          <p className="text-sm font-medium text-rose-100">{labels.fatalTitle}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-rose-200">
            {fatalErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-lg border border-slate-600 bg-slate-950/40 p-3">
          <h2 className="text-base font-semibold text-slate-100">{labels.previewTitle}</h2>
          {preview.sheetWarning ? <p className="text-sm text-amber-200">{preview.sheetWarning}</p> : null}
          <p className="text-sm text-emerald-200">
            {labels.validRowsTemplate.replace(/\{count\}/g, String(preview.rowCount))}
          </p>
          <p className="text-xs text-slate-500">
            {labels.sampleNote} {preview.activeSheet ? `(${preview.activeSheet})` : ""}
          </p>

          {preview.rowErrors.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-rose-200">{labels.rowIssuesTitle}</p>
              <ul className="mt-1 max-h-48 overflow-y-auto list-inside list-disc text-sm text-rose-100/90">
                {preview.rowErrors.slice(0, 80).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              {preview.rowErrors.length > 80 ? (
                <p className="mt-1 text-xs text-slate-500">+{preview.rowErrors.length - 80} more</p>
              ) : null}
            </div>
          ) : null}

          {preview.sampleRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-xs text-slate-200">
                <thead>
                  <tr className="border-b border-slate-600 text-slate-400">
                    <th className="py-2 pr-2">{labels.tableDate}</th>
                    <th className="py-2 pr-2">{labels.tableAmount}</th>
                    <th className="py-2 pr-2">{labels.tableLitres}</th>
                    <th className="py-2 pr-2">{labels.tableOdo}</th>
                    <th className="py-2">{labels.tableNotes}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.map((r, i) => (
                    <tr key={`${r.filled_at}-${i}`} className="border-b border-slate-700/80">
                      <td className="py-1.5 pr-2 tabular-nums">{r.filled_at}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.amount_paid}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.litres}</td>
                      <td className="py-1.5 pr-2 tabular-nums">{r.odometer_km}</td>
                      <td className="max-w-[12rem] truncate py-1.5 text-slate-400" title={r.notes ?? undefined}>
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!preview.canCommit ? (
            <p className="text-sm text-amber-200/90">{labels.commitBlocked}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
