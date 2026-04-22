"use client";

import { useEffect, useMemo, useState } from "react";
import type { TipulimImportProfile } from "@/lib/therapy/import-tipulim";
import { FileUploadField } from "@/components/file-upload-field";

type Job = { id: string; title: string };
type Program = { id: string; jobId: string; name: string; jobLabel?: string };

type PreviewData = {
  newClientsCount: number;
  treatmentsTotal: number;
  receiptsNeedingManualTreatmentCount?: number;
  treatmentsPerClient: Array<{
    displayName: string;
    clientId: string | null;
    count: number;
    majorityVisitType: "clinic" | "home" | "phone" | "video" | null;
  }>;
  receiptsToCreateCount: number;
  programsToAutoCreate: Array<{ name: string; source: "system_default" | "sheet"; treatmentCount: number }>;
  warnings: string[];
  blockingErrors: string[];
  clientConflicts: Array<{
    key: string;
    rowNumber: number;
    rawName: string;
    candidates: Array<{ id: string; label: string }>;
  }>;
  routing?: {
    travelEntriesCount: number;
    consultationEntriesCount: number;
  };
  error?: string;
  sheetNames?: string[];
  message?: string;
  created?: {
    clients: number;
    treatments: number;
    receipts: number;
    allocations: number;
    travel: number;
    consultations: number;
    programs: number;
    consultationAllocations: number;
    travelAllocations: number;
  };
  durationMs?: number;
  completedAtIso?: string;
  auditId?: string;
  importDebug?: {
    unlinkedReceiptsCount: number;
    unlinkedReceiptsSample: Array<{ rowNumber: number; receiptNumber: string }>;
    orgPaymentDiagnosticsSample?: Array<{
      rowNumber: number;
      receiptNumber: string;
      coveredMonthRaw: string;
      coveredMonthKey: string | null;
      fallbackIssuedMonthKey: string;
      monthKeyUsed: string;
      matchedTreatments: number;
      matchedConsultations?: number;
      matchedTravel?: number;
      matchedTreatmentsAmount?: string;
      matchedConsultationsAmount?: string;
      matchedTravelAmount?: string;
    }>;
    commitLinkDiagnostics?: {
      allocationsMissingTreatmentKey: number;
      markPaidMissingTreatmentKey: number;
      missingTreatmentKeysSample: string[];
    };
  };
};

function rowFromError(errorText: string): string | null {
  const m = errorText.match(/Row\s+(\d+):/i);
  return m?.[1] ?? null;
}

function formatBlockingError(
  errorText: string,
  labels: {
    importErrUnlinkedReceiptWithRow: string;
    importErrUnlinkedReceipt: string;
    importErrAllocationMismatchWithRow: string;
    importErrAllocationMismatch: string;
  },
): string {
  const row = rowFromError(errorText);
  if (errorText.includes("could not be linked to any treatments")) {
    return row
      ? labels.importErrUnlinkedReceiptWithRow.replace("{row}", row)
      : labels.importErrUnlinkedReceipt;
  }
  if (errorText.includes("does not match allocations") || errorText.includes("does not match linked treatments")) {
    return row
      ? labels.importErrAllocationMismatchWithRow.replace("{row}", row)
      : labels.importErrAllocationMismatch;
  }
  return errorText;
}

export function TherapyTreatmentsImportForm({
  jobs,
  programs,
  labels,
  variant = "treatments",
  defaultUsualTreatmentCost,
  defaultUsualTreatmentCostCurrency,
}: {
  jobs: Job[];
  programs: Program[];
  variant?: "treatments" | "receipts";
  /** Prefill usual session fee (receipt import). */
  defaultUsualTreatmentCost?: string | null;
  /** Prefill usual session fee currency (receipt import). */
  defaultUsualTreatmentCostCurrency?: string | null;
  labels: {
    title: string;
    instructions: string;
    profile: string;
    profilePrivate: string;
    profileOrg: string;
    job: string;
    program: string;
    autoProgramHint: string;
    chooseFile: string;
    sheet: string;
    missingVisitType: string;
    noFallback: string;
    visitClinic: string;
    visitHome: string;
    visitPhone: string;
    visitVideo: string;
    analyze: string;
    confirm: string;
    clearPreview: string;
    summaryTitle: string;
    newClients: string;
    treatments: string;
    receipts: string;
    programsToCreate: string;
    warningTitle: string;
    errorsTitle: string;
    conflictsTitle: string;
    applyNote: string;
    downloadExample: string;
    importErrUnlinkedReceiptWithRow: string;
    importErrUnlinkedReceipt: string;
    importErrAllocationMismatchWithRow: string;
    importErrAllocationMismatch: string;
    importDebugTitle: string;
    importCreatedCountsTitle: string;
    importCreatedClients: string;
    importCreatedAllocations: string;
    importCreatedTreatments: string;
    importCreatedReceipts: string;
    importCreatedConsultations: string;
    importCreatedTravel: string;
    importCreatedPrograms: string;
    importDetailedMessagePrefix: string;
    importDetailedMessageCreated: string;
    importWorkingAnalyze: string;
    importWorkingCommit: string;
    importWorkingElapsed: string;
    importWorkingProgress: string;
    importWorkingLeaveWarning: string;
    importWorkingDoNotNavigate: string;
    importDebugUnlinkedReceipts: string;
    importDebugOrgPaymentRows: string;
    importDebugCommitLinkTitle: string;
    importDebugMissingAllocationLinks: string;
    importDebugMissingMarkPaidLinks: string;
    usualTreatmentCostLabel?: string;
    usualTreatmentCostCurrencyLabel?: string;
    usualTreatmentCostHint?: string;
    saveUsualTreatmentCostDefault?: string;
    importReceiptsNeedingManualTreatment?: string;
  };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState("");
  const [profile, setProfile] = useState<TipulimImportProfile>(
    variant === "receipts" ? "tipulim_receipts_only" : "tipulim_private",
  );
  const [programId, setProgramId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState<"preview" | "commit" | null>(null);
  const [busyStartedAtMs, setBusyStartedAtMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [clientResolutions, setClientResolutions] = useState<Record<string, string>>({});
  const [sheetName, setSheetName] = useState("");
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [missingVisitType, setMissingVisitType] = useState("");
  const [usualTreatmentCost, setUsualTreatmentCost] = useState(
    () => defaultUsualTreatmentCost?.trim() ?? "",
  );
  const [usualTreatmentCostCurrency, setUsualTreatmentCostCurrency] = useState(
    () => defaultUsualTreatmentCostCurrency?.trim().toUpperCase() ?? "ILS",
  );
  const [saveUsualTreatmentCostDefault, setSaveUsualTreatmentCostDefault] = useState(false);

  function formatDuration(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return "0s";
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  }

  const jobPrograms = useMemo(
    () => programs.filter((p) => p.jobId === jobId),
    [programs, jobId],
  );

  const exampleHref = `/api/private-clinic/import/tipulim/example?profile=${encodeURIComponent(profile)}`;

  useEffect(() => {
    if (variant === "receipts") {
      setProfile("tipulim_receipts_only");
    }
  }, [variant]);

  useEffect(() => {
    if (defaultUsualTreatmentCost != null && defaultUsualTreatmentCost !== "") {
      setUsualTreatmentCost(defaultUsualTreatmentCost.trim());
    }
  }, [defaultUsualTreatmentCost]);

  useEffect(() => {
    if (defaultUsualTreatmentCostCurrency && defaultUsualTreatmentCostCurrency.trim()) {
      setUsualTreatmentCostCurrency(defaultUsualTreatmentCostCurrency.trim().toUpperCase());
    }
  }, [defaultUsualTreatmentCostCurrency]);

  useEffect(() => {
    if (!busy || !busyStartedAtMs) {
      setElapsedMs(0);
      return;
    }
    setElapsedMs(Math.max(0, Date.now() - busyStartedAtMs));
    const timer = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - busyStartedAtMs));
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy, busyStartedAtMs]);

  useEffect(() => {
    if (!busy) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = labels.importWorkingLeaveWarning;
      return labels.importWorkingLeaveWarning;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [busy, labels.importWorkingLeaveWarning]);

  const progressPercent = useMemo(() => {
    if (!busy) return 0;
    const expectedMs = busyMode === "commit" ? 180_000 : 45_000;
    return Math.max(3, Math.min(95, Math.round((elapsedMs / expectedMs) * 100)));
  }, [busy, busyMode, elapsedMs]);

  const receiptCostMissing = variant === "receipts" && !usualTreatmentCost.trim();

  async function post(mode: "preview" | "commit") {
    if (!file || !jobId || receiptCostMissing) return;
    setBusy(true);
    setBusyMode(mode);
    setBusyStartedAtMs(Date.now());
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("job_id", jobId);
    fd.append("profile", profile);
    fd.append("mode", mode);
    if (programId) fd.append("program_id", programId);
    if (sheetName) fd.append("sheet_name", sheetName);
    if (missingVisitType) fd.append("missing_visit_type", missingVisitType);
    if (Object.keys(clientResolutions).length > 0) {
      fd.append("client_resolutions", JSON.stringify(clientResolutions));
    }
    if (variant === "receipts") {
      fd.append("usual_treatment_cost", usualTreatmentCost.trim());
      fd.append("usual_treatment_cost_currency", usualTreatmentCostCurrency.trim().toUpperCase());
      if (saveUsualTreatmentCostDefault) {
        fd.append("save_usual_treatment_cost_default", "1");
      }
    }
    try {
      const res = await fetch("/api/private-clinic/import/tipulim", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as PreviewData & { ok?: boolean; error?: string };
      if (!res.ok) {
        setMsg(data.error ?? "Request failed");
        return;
      }
      if (data.error === "sheet_selection_required" && Array.isArray(data.sheetNames)) {
        setSheetOptions(data.sheetNames);
        if (!sheetName && data.sheetNames[0]) setSheetName(data.sheetNames[0]);
        setMsg(data.message ?? "Please choose a sheet and analyze again.");
        setPreview(null);
        return;
      }
      if (mode === "preview") {
        setPreview(data);
        if (data.clientConflicts.length > 0) {
          const next: Record<string, string> = { ...clientResolutions };
          for (const c of data.clientConflicts) {
            if (!next[c.key] && c.candidates[0]) next[c.key] = c.candidates[0].id;
          }
          setClientResolutions(next);
        }
      } else {
        setPreview(data);
        if (data.blockingErrors.length > 0) {
          const durationPart = typeof data.durationMs === "number" ? ` (${formatDuration(data.durationMs)})` : "";
          setMsg(`${labels.errorsTitle}${durationPart}`);
        } else {
          const created = data.created;
          const durationPart = typeof data.durationMs === "number" ? formatDuration(data.durationMs) : "n/a";
          const details = created
            ? `${labels.importDetailedMessagePrefix} ${durationPart}. ${labels.importDetailedMessageCreated} ${labels.importCreatedClients}=${created.clients}, ${labels.importCreatedTreatments}=${created.treatments}, ${labels.importCreatedReceipts}=${created.receipts}, ${labels.importCreatedAllocations}=${created.allocations}, ${labels.importCreatedConsultations}=${created.consultations}, ${labels.importCreatedTravel}=${created.travel}, ${labels.importCreatedPrograms}=${created.programs}, consultation allocations=${created.consultationAllocations}, travel allocations=${created.travelAllocations}.`
            : labels.applyNote;
          setMsg(details);
        }
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
      setBusyMode(null);
      setBusyStartedAtMs(null);
    }
  }

  const displayBlockingErrors = useMemo(
    () =>
      preview?.blockingErrors.map((er) =>
        formatBlockingError(er, {
          importErrUnlinkedReceiptWithRow: labels.importErrUnlinkedReceiptWithRow,
          importErrUnlinkedReceipt: labels.importErrUnlinkedReceipt,
          importErrAllocationMismatchWithRow: labels.importErrAllocationMismatchWithRow,
          importErrAllocationMismatch: labels.importErrAllocationMismatch,
        }),
      ) ?? [],
    [
      preview?.blockingErrors,
      labels.importErrUnlinkedReceiptWithRow,
      labels.importErrUnlinkedReceipt,
      labels.importErrAllocationMismatchWithRow,
      labels.importErrAllocationMismatch,
    ],
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <h3 className="text-base font-semibold text-slate-100">{labels.title}</h3>
      <p className="text-sm text-slate-300">{labels.instructions}</p>
      <div className="grid gap-3 md:grid-cols-2">
        {variant === "treatments" ? (
          <label className="text-sm text-slate-200">
            {labels.profile}
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
              value={profile}
              onChange={(e) => setProfile(e.target.value as TipulimImportProfile)}
            >
              <option value="tipulim_private">{labels.profilePrivate}</option>
              <option value="tipulim_org_monthly">{labels.profileOrg}</option>
            </select>
            <a
              href={exampleHref}
              className="mt-2 inline-block text-sm text-sky-400 hover:underline"
              download
            >
              {labels.downloadExample}
            </a>
          </label>
        ) : (
          <div className="text-sm text-slate-200">
            <a
              href={exampleHref}
              className="inline-block text-sky-400 hover:underline"
              download
            >
              {labels.downloadExample}
            </a>
          </div>
        )}
        <label className="text-sm text-slate-200">
          {labels.job}
          <select
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setProgramId("");
            }}
          >
            <option value="">—</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-200">
          {labels.program}
          <select
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            disabled={jobPrograms.length === 0}
          >
            <option value="">—</option>
            {jobPrograms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.jobLabel ? `${p.jobLabel} — ${p.name}` : p.name}
              </option>
            ))}
          </select>
          {jobPrograms.length === 0 && <p className="mt-1 text-xs text-slate-400">{labels.autoProgramHint}</p>}
        </label>
        <label className="text-sm text-slate-200">
          {labels.chooseFile}
          <div className="mt-1">
            <FileUploadField
              id="therapy-treatments-import-file"
              accept=".xlsx,.xls,.csv"
              onFileChange={setFile}
              fileName={file?.name ?? null}
              className="w-full"
              textClassName="max-w-full truncate text-sm text-slate-300"
            />
          </div>
        </label>
        {sheetOptions.length > 0 && (
          <label className="text-sm text-slate-200">
            {labels.sheet}
            <select
              className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
            >
              {sheetOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm text-slate-200">
          {labels.missingVisitType}
          <select
            className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
            value={missingVisitType}
            onChange={(e) => setMissingVisitType(e.target.value)}
          >
            <option value="">{labels.noFallback}</option>
            <option value="clinic">{labels.visitClinic}</option>
            <option value="home">{labels.visitHome}</option>
            <option value="phone">{labels.visitPhone}</option>
            <option value="video">{labels.visitVideo}</option>
          </select>
        </label>
        {variant === "receipts" && labels.usualTreatmentCostLabel ? (
          <>
            <label className="text-sm text-slate-200 md:col-span-2">
              {labels.usualTreatmentCostLabel}
              <div className="mt-1 flex max-w-md gap-2">
                <input
                  type="text"
                  name="usual_treatment_cost"
                  inputMode="decimal"
                  autoComplete="off"
                  className="w-32 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                  value={usualTreatmentCost}
                  onChange={(e) => setUsualTreatmentCost(e.target.value)}
                />
                <input
                  type="text"
                  name="usual_treatment_cost_currency"
                  autoComplete="off"
                  maxLength={8}
                  className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm uppercase"
                  value={usualTreatmentCostCurrency}
                  onChange={(e) => setUsualTreatmentCostCurrency(e.target.value.toUpperCase())}
                  placeholder={labels.usualTreatmentCostCurrencyLabel ?? "Currency"}
                  aria-label={labels.usualTreatmentCostCurrencyLabel ?? "Currency"}
                />
              </div>
              {labels.usualTreatmentCostHint ? (
                <p className="mt-1 text-xs text-slate-400">{labels.usualTreatmentCostHint}</p>
              ) : null}
            </label>
            {labels.saveUsualTreatmentCostDefault ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200 md:col-span-2">
                <input
                  type="checkbox"
                  checked={saveUsualTreatmentCostDefault}
                  onChange={(e) => setSaveUsualTreatmentCostDefault(e.target.checked)}
                />
                {labels.saveUsualTreatmentCostDefault}
              </label>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => post("preview")}
          disabled={busy || !file || !jobId || receiptCostMissing}
          className="rounded bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {labels.analyze}
        </button>
        <button
          type="button"
          onClick={() => post("commit")}
          disabled={
            busy ||
            !preview ||
            preview.blockingErrors.length > 0 ||
            preview.clientConflicts.length > 0 ||
            !file ||
            !jobId ||
            receiptCostMissing
          }
          className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          {labels.confirm}
        </button>
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            setMsg(null);
            setClientResolutions({});
          }}
          disabled={busy}
          className="rounded bg-violet-700 px-3 py-1.5 text-sm text-violet-100 hover:bg-violet-600 disabled:opacity-50"
        >
          {labels.clearPreview}
        </button>
      </div>
      {busy && (
        <div className="rounded border border-sky-700 bg-sky-950/30 p-3 text-xs text-sky-100">
          <p className="font-medium">{busyMode === "commit" ? labels.importWorkingCommit : labels.importWorkingAnalyze}</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-800">
            <div
              className="h-full rounded bg-sky-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-label={labels.importWorkingProgress}
            />
          </div>
          <p className="mt-2">
            {labels.importWorkingProgress}: {progressPercent}% · {labels.importWorkingElapsed}: {formatDuration(elapsedMs)}
          </p>
          <p className="mt-1 text-[11px] text-sky-200">{labels.importWorkingDoNotNavigate}</p>
        </div>
      )}
      {msg && <p className="text-sm text-slate-200">{msg}</p>}
      {preview && (
        <div className="space-y-3 rounded border border-slate-700 bg-slate-950/60 p-3">
          <h4 className="text-sm font-semibold text-slate-100">{labels.summaryTitle}</h4>
          <ul className="text-sm text-slate-300">
            <li>
              {labels.newClients}: {preview.newClientsCount}
            </li>
            <li>
              {labels.treatments}: {preview.treatmentsTotal}
            </li>
            <li>
              {labels.receipts}: {preview.receiptsToCreateCount}
            </li>
            {typeof preview.receiptsNeedingManualTreatmentCount === "number" &&
            preview.receiptsNeedingManualTreatmentCount > 0 &&
            labels.importReceiptsNeedingManualTreatment ? (
              <li>
                {labels.importReceiptsNeedingManualTreatment}:{" "}
                {preview.receiptsNeedingManualTreatmentCount}
              </li>
            ) : null}
          </ul>
          {preview.treatmentsPerClient.length > 0 && (
            <div className="text-xs text-slate-400">
              {preview.treatmentsPerClient.map((r) => (
                <p key={r.displayName}>
                  {r.displayName}: {r.count}
                  {r.majorityVisitType ? ` (default visit: ${r.majorityVisitType})` : ""}
                </p>
              ))}
            </div>
          )}
          {preview.programsToAutoCreate.length > 0 && (
            <div className="rounded border border-indigo-700 bg-indigo-950/40 p-2 text-sm text-indigo-100">
              <p className="font-medium">{labels.programsToCreate}</p>
              <ul className="mt-1 list-disc pl-5">
                {preview.programsToAutoCreate.map((p) => (
                  <li key={p.name}>
                    {p.name} ({p.treatmentCount})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.clientConflicts.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-200">{labels.conflictsTitle}</p>
              {preview.clientConflicts.map((c) => (
                <label key={c.key} className="block text-xs text-slate-300">
                  {c.rawName} (row {c.rowNumber})
                  <select
                    className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1"
                    value={clientResolutions[c.key] ?? ""}
                    onChange={(e) =>
                      setClientResolutions((prev) => ({ ...prev, [c.key]: e.target.value }))
                    }
                  >
                    {c.candidates.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-200">{labels.warningTitle}</p>
              <ul className="list-disc pl-5 text-xs text-yellow-100">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {preview.blockingErrors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-rose-200">{labels.errorsTitle}</p>
              <ul className="list-disc pl-5 text-xs text-rose-100">
                {displayBlockingErrors.map((er, i) => (
                  <li key={i}>{er}</li>
                ))}
              </ul>
            </div>
          )}
          {(preview.created || preview.importDebug) && (
            <div className="rounded border border-cyan-700 bg-cyan-950/30 p-2 text-xs text-cyan-100">
              <p className="font-medium">{labels.importDebugTitle}</p>
              {preview.created && (
                <p>
                  {labels.importCreatedCountsTitle}: {labels.importCreatedClients}={preview.created.clients},{" "}
                  {labels.importCreatedTreatments}={preview.created.treatments}, {labels.importCreatedReceipts}=
                  {preview.created.receipts}, {labels.importCreatedAllocations}={preview.created.allocations},{" "}
                  {labels.importCreatedConsultations}={preview.created.consultations}, {labels.importCreatedTravel}=
                  {preview.created.travel}, {labels.importCreatedPrograms}={preview.created.programs}
                </p>
              )}
              {preview.importDebug && (
                <>
                  <p>
                    {labels.importDebugUnlinkedReceipts}: {preview.importDebug.unlinkedReceiptsCount}
                  </p>
                  {preview.importDebug.unlinkedReceiptsSample.length > 0 && (
                    <ul className="list-disc pl-5">
                      {preview.importDebug.unlinkedReceiptsSample.map((r, i) => (
                        <li key={`${r.receiptNumber}-${r.rowNumber}-${i}`}>
                          #{r.receiptNumber} (row {r.rowNumber})
                        </li>
                      ))}
                    </ul>
                  )}
                  {preview.importDebug.orgPaymentDiagnosticsSample &&
                    preview.importDebug.orgPaymentDiagnosticsSample.length > 0 && (
                      <>
                        <p>{labels.importDebugOrgPaymentRows}:</p>
                        <p className="text-cyan-200/90">Key: T = treatments, C = consultations, TR = travel entries</p>
                        <ul className="list-disc pl-5">
                          {preview.importDebug.orgPaymentDiagnosticsSample.map((d, i) => (
                            <li key={`${d.receiptNumber}-${d.rowNumber}-${i}`}>
                              #{d.receiptNumber} row {d.rowNumber} | raw=&quot;{d.coveredMonthRaw || "—"}&quot; | key=
                              {d.monthKeyUsed} | matched: T={d.matchedTreatments}, C={d.matchedConsultations ?? 0},
                              TR={d.matchedTravel ?? 0} | amounts: T={d.matchedTreatmentsAmount ?? "0.00"}, C=
                              {d.matchedConsultationsAmount ?? "0.00"}, TR={d.matchedTravelAmount ?? "0.00"}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  {preview.importDebug.commitLinkDiagnostics && (
                    <>
                      <p>{labels.importDebugCommitLinkTitle}:</p>
                      <ul className="list-disc pl-5">
                        <li>
                          {labels.importDebugMissingAllocationLinks}:{" "}
                          {preview.importDebug.commitLinkDiagnostics.allocationsMissingTreatmentKey}
                        </li>
                        <li>
                          {labels.importDebugMissingMarkPaidLinks}:{" "}
                          {preview.importDebug.commitLinkDiagnostics.markPaidMissingTreatmentKey}
                        </li>
                        {preview.importDebug.commitLinkDiagnostics.missingTreatmentKeysSample.length > 0 && (
                          <li>
                            keys: {preview.importDebug.commitLinkDiagnostics.missingTreatmentKeysSample.join(", ")}
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
