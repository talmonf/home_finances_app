"use client";

import { useMemo, useState } from "react";

type Job = { id: string; title: string };
type Program = { id: string; jobId: string; name: string };

type PreviewData = {
  newClientsCount: number;
  treatmentsTotal: number;
  treatmentsPerClient: Array<{ displayName: string; clientId: string | null; count: number }>;
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
};

export function TherapyTreatmentsImportDialog({
  jobs,
  programs,
  labels,
}: {
  jobs: Job[];
  programs: Program[];
  labels: {
    importBtn: string;
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
    cancel: string;
    summaryTitle: string;
    newClients: string;
    treatments: string;
    receipts: string;
    programsToCreate: string;
    warningTitle: string;
    errorsTitle: string;
    conflictsTitle: string;
    applyNote: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState("");
  const [profile, setProfile] = useState<"tipulim_private" | "tipulim_org_monthly">("tipulim_private");
  const [programId, setProgramId] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [clientResolutions, setClientResolutions] = useState<Record<string, string>>({});
  const [sheetName, setSheetName] = useState("");
  const [sheetOptions, setSheetOptions] = useState<string[]>([]);
  const [missingVisitType, setMissingVisitType] = useState("");

  const jobPrograms = useMemo(
    () => programs.filter((p) => p.jobId === jobId),
    [programs, jobId],
  );

  async function post(mode: "preview" | "commit") {
    if (!file || !jobId) return;
    setBusy(true);
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
        setMsg(data.blockingErrors.length ? labels.errorsTitle : labels.applyNote);
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        {labels.importBtn}
      </button>
      {open && (
        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
          <h3 className="text-base font-semibold text-slate-100">{labels.title}</h3>
          <p className="text-sm text-slate-300">{labels.instructions}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-200">
              {labels.profile}
              <select
                className="mt-1 w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm"
                value={profile}
                onChange={(e) => setProfile(e.target.value as "tipulim_private" | "tipulim_org_monthly")}
              >
                <option value="tipulim_private">{labels.profilePrivate}</option>
                <option value="tipulim_org_monthly">{labels.profileOrg}</option>
              </select>
            </label>
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
                    {p.name}
                  </option>
                ))}
              </select>
              {jobPrograms.length === 0 && <p className="mt-1 text-xs text-slate-400">{labels.autoProgramHint}</p>}
            </label>
            <label className="text-sm text-slate-200">
              {labels.chooseFile}
              <input
                className="mt-1 w-full text-sm text-slate-300"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
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
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => post("preview")}
              disabled={busy || !file || !jobId}
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
                !jobId
              }
              className="rounded bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {labels.confirm}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPreview(null);
                setMsg(null);
              }}
              className="rounded border border-slate-600 px-3 py-1.5 text-sm"
            >
              {labels.cancel}
            </button>
          </div>
          {msg && <p className="text-sm text-slate-200">{msg}</p>}
          {preview && (
            <div className="space-y-3 rounded border border-slate-700 bg-slate-950/60 p-3">
              <h4 className="text-sm font-semibold text-slate-100">{labels.summaryTitle}</h4>
              <ul className="text-sm text-slate-300">
                <li>{labels.newClients}: {preview.newClientsCount}</li>
                <li>{labels.treatments}: {preview.treatmentsTotal}</li>
                <li>{labels.receipts}: {preview.receiptsToCreateCount}</li>
              </ul>
              {preview.treatmentsPerClient.length > 0 && (
                <div className="text-xs text-slate-400">
                  {preview.treatmentsPerClient.map((r) => (
                    <p key={r.displayName}>{r.displayName}: {r.count}</p>
                  ))}
                </div>
              )}
              {preview.programsToAutoCreate.length > 0 && (
                <div className="rounded border border-indigo-700 bg-indigo-950/40 p-2 text-sm text-indigo-100">
                  <p className="font-medium">{labels.programsToCreate}</p>
                  <ul className="mt-1 list-disc pl-5">
                    {preview.programsToAutoCreate.map((p) => (
                      <li key={p.name}>{p.name} ({p.treatmentCount})</li>
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
                    {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
              {preview.blockingErrors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-rose-200">{labels.errorsTitle}</p>
                  <ul className="list-disc pl-5 text-xs text-rose-100">
                    {preview.blockingErrors.map((er, i) => <li key={i}>{er}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

