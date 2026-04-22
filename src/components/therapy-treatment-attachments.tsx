"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUploadField } from "@/components/file-upload-field";
import type { UiLanguage } from "@/lib/ui-language";
import { privateClinicTreatmentAttachments } from "@/lib/private-clinic-i18n";

export type TherapyTreatmentAttachmentRow = {
  id: string;
  file_name: string;
  mime_type: string;
  byte_size: number | null;
  transcription_status: string;
  transcription_text: string | null;
  transcription_error: string | null;
  transcription_language: string | null;
};

type Props = {
  treatmentId: string;
  uiLanguage: UiLanguage;
  attachments: TherapyTreatmentAttachmentRow[];
  showHebrewAwsFallbackHint?: boolean;
};

function isAudioMime(mime: string): boolean {
  return mime.toLowerCase().startsWith("audio/");
}

export function TherapyTreatmentAttachments({
  treatmentId,
  uiLanguage,
  attachments,
  showHebrewAwsFallbackHint = false,
}: Props) {
  const router = useRouter();
  const s = privateClinicTreatmentAttachments(uiLanguage);
  const [busyUpload, setBusyUpload] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyTranscribe, setBusyTranscribe] = useState<{ id: string; language: "en" | "he" } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  async function readErrorMessage(res: Response, fallback: string): Promise<string> {
    const text = await res.text();
    if (!text.trim()) return fallback;
    try {
      const data = JSON.parse(text) as { error?: string; message?: string };
      return data?.error ?? data?.message ?? text;
    } catch {
      return text;
    }
  }

  async function onUpload() {
    if (!uploadFile) {
      setError(s.uploadFailed);
      return;
    }
    setBusyUpload(true);
    setError(null);
    try {
      const initRes = await fetch(`/api/private-clinic/treatments/${treatmentId}/attachments/direct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          byteSize: uploadFile.size,
        }),
      });
      if (!initRes.ok) {
        setError(await readErrorMessage(initRes, s.uploadFailed));
        return;
      }
      const initData = (await initRes.json()) as {
        attachmentId: string;
        uploadUrl: string;
        uploadHeaders?: Record<string, string>;
        fileName: string;
        mimeType: string;
        byteSize: number;
        storageBucket: string;
        storageKey: string;
      };
      try {
        const uploadRes = await fetch(initData.uploadUrl, {
          method: "PUT",
          headers: initData.uploadHeaders,
          body: uploadFile,
        });
        if (!uploadRes.ok) {
          setError(await readErrorMessage(uploadRes, s.uploadFailed));
          return;
        }
      } catch {
        // Surface an explicit message instead of trying server fallback,
        // which can exceed serverless request limits for larger files.
        setError("Direct upload failed before reaching storage. Please retry.");
        return;
      }

      const completeBody = JSON.stringify({
        attachmentId: initData.attachmentId,
        fileName: initData.fileName,
        mimeType: initData.mimeType,
        byteSize: initData.byteSize,
        storageBucket: initData.storageBucket,
        storageKey: initData.storageKey,
      });
      const completeRetryDelaysMs = [300, 700, 1200, 2000];
      let completeRes: Response | null = null;
      for (let i = 0; i <= completeRetryDelaysMs.length; i += 1) {
        completeRes = await fetch(
          `/api/private-clinic/treatments/${treatmentId}/attachments/direct/complete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: completeBody,
          },
        );
        if (completeRes.ok) break;
        if (completeRes.status !== 409 || i === completeRetryDelaysMs.length) break;
        await new Promise((resolve) => setTimeout(resolve, completeRetryDelaysMs[i]));
      }

      if (!completeRes?.ok) {
        setError(await readErrorMessage(completeRes as Response, s.uploadFailed));
        return;
      }
      router.refresh();
      setUploadFile(null);
    } catch {
      setError(s.uploadFailed);
    } finally {
      setBusyUpload(false);
    }
  }

  async function removeAttachment(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/private-clinic/treatment-attachments/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await readErrorMessage(res, s.uploadFailed));
        return;
      }
      router.refresh();
    } catch {
      setError(s.uploadFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function transcribe(id: string, language: "en" | "he") {
    setBusyTranscribe({ id, language });
    setError(null);
    try {
      const res = await fetch(`/api/private-clinic/treatment-attachments/${id}/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) {
        router.refresh();
        return;
      }
      router.refresh();
    } catch {
      // Network/runtime failures may not be persisted on the attachment row.
      setError(s.transcribeFailed);
    } finally {
      setBusyTranscribe(null);
    }
  }

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(s.transcribeFailed);
    }
  }

  return (
    <div className="mt-3 space-y-2 border-t border-slate-700/80 pt-2">
      <div className="text-xs font-medium text-slate-400">{s.heading}</div>
      <p className="text-[11px] leading-snug text-slate-500">{s.privacyNotice}</p>
      {showHebrewAwsFallbackHint ? (
        <p className="text-[11px] leading-snug text-amber-300">{s.hebrewAwsFallbackHint}</p>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onUpload();
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <FileUploadField
          id={`therapy-treatment-attachment-file-${treatmentId}`}
          name="file"
          required
          onFileChange={setUploadFile}
          fileName={uploadFile?.name ?? null}
          className="max-w-[320px] flex flex-wrap items-center gap-2"
          textClassName="max-w-[180px] truncate text-[11px] text-slate-200"
        />
        <button
          type="submit"
          disabled={busyUpload || !uploadFile}
          className="rounded bg-slate-600 px-2 py-1 text-[11px] text-white hover:bg-slate-500 disabled:opacity-60"
        >
          {busyUpload ? s.uploading : s.uploadFile}
        </button>
      </form>
      <p className="text-[11px] text-slate-500">{s.uploadConstraintsHint}</p>
      {error ? <p className="text-[11px] text-rose-400">{error}</p> : null}
      {attachments.length === 0 ? (
        <p className="text-[11px] text-slate-500">{s.noAttachments}</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => {
            const audio = isAudioMime(a.mime_type);
            const busy = busyId === a.id;
            const transcribeBusy = busyTranscribe?.id === a.id;
            const canTranscribe =
              audio && (a.transcription_status === "none" || a.transcription_status === "failed");
            return (
              <li key={a.id} className="rounded border border-slate-700/80 bg-slate-900/40 p-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-200">{a.file_name}</span>
                  <a
                    href={`/api/private-clinic/treatment-attachments/${a.id}/download`}
                    className="text-sky-400 hover:underline"
                  >
                    {s.download}
                  </a>
                  <a
                    href={`/api/private-clinic/treatment-attachments/${a.id}/download?disposition=inline`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline"
                  >
                    {s.open}
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeAttachment(a.id)}
                    className="text-rose-400 hover:underline disabled:opacity-50"
                  >
                    {s.remove}
                  </button>
                </div>
                {audio ? (
                  <div className="mt-2 space-y-1">
                    {a.transcription_status === "pending" ? (
                      <p className="text-slate-500">{s.statusPending}</p>
                    ) : null}
                    {a.transcription_status === "failed" && a.transcription_error ? (
                      <p className="text-rose-400">{a.transcription_error}</p>
                    ) : null}
                    {canTranscribe ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy || transcribeBusy}
                          onClick={() => transcribe(a.id, "en")}
                          className="rounded bg-indigo-700 px-2 py-0.5 text-white hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {busyTranscribe?.id === a.id && busyTranscribe.language === "en"
                            ? s.transcribing
                            : s.transcribeEn}
                        </button>
                        <button
                          type="button"
                          disabled={busy || transcribeBusy}
                          onClick={() => transcribe(a.id, "he")}
                          className="rounded bg-indigo-700 px-2 py-0.5 text-white hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {busyTranscribe?.id === a.id && busyTranscribe.language === "he"
                            ? s.transcribing
                            : s.transcribeHe}
                        </button>
                      </div>
                    ) : null}
                    {a.transcription_status === "completed" && a.transcription_text ? (
                      <div className="mt-1 space-y-1">
                        <div className="text-slate-400">{s.transcript}</div>
                        <p className="whitespace-pre-wrap text-slate-200">{a.transcription_text}</p>
                        <button
                          type="button"
                          onClick={() => copyText(a.transcription_text!, a.id)}
                          className="text-sky-400 hover:underline"
                        >
                          {copiedId === a.id ? s.copied : s.copyTranscript}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
