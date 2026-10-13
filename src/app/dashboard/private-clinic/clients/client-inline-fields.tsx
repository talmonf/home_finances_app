"use client";

import { useRef, useState } from "react";
import type { KupatHolimValue } from "@/lib/private-clinic/kupat-holim-filter";

type SaveResult = { ok: true; value: string | null } | { ok: false };

async function saveInlineField(body: {
  clientId: string;
  field: "kupat_holim" | "address" | "team_members";
  value: string;
}): Promise<SaveResult> {
  const res = await fetch("/api/private-clinic/clients/inline-field", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; value?: string | null } | null;
  if (!res.ok || !data?.ok) return { ok: false };
  return { ok: true, value: data.value ?? null };
}

const controlClass =
  "w-full min-w-[7.5rem] rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 disabled:opacity-60";

export function ClientInlineKupatField({
  clientId,
  value,
  options,
  ariaLabel,
  saveFailedLabel,
}: {
  clientId: string;
  value: "" | KupatHolimValue;
  options: Array<{ id: "" | KupatHolimValue; label: string }>;
  ariaLabel: string;
  saveFailedLabel: string;
}) {
  const [current, setCurrent] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  async function onChange(next: string) {
    if (next === current) return;
    const previous = current;
    const id = ++requestId.current;
    setCurrent(next as "" | KupatHolimValue);
    setError(null);
    setSaving(true);
    try {
      const result = await saveInlineField({ clientId, field: "kupat_holim", value: next });
      if (id !== requestId.current) return;
      if (!result.ok) {
        setCurrent(previous);
        setError(saveFailedLabel);
        return;
      }
      setCurrent((result.value ?? "") as "" | KupatHolimValue);
    } catch {
      if (id !== requestId.current) return;
      setCurrent(previous);
      setError(saveFailedLabel);
    } finally {
      if (id === requestId.current) setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        aria-label={ariaLabel}
        value={current}
        disabled={saving}
        onChange={(event) => void onChange(event.target.value)}
        className={controlClass}
      >
        {options.map((option) => (
          <option key={option.id || "none"} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-[10px] text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ClientInlineTextField({
  clientId,
  field,
  value,
  ariaLabel,
  saveFailedLabel,
}: {
  clientId: string;
  field: "address" | "team_members";
  value: string;
  ariaLabel: string;
  saveFailedLabel: string;
}) {
  const [saved, setSaved] = useState(value);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const draftRef = useRef(value);
  const skipCommit = useRef(false);

  function setDraftValue(next: string) {
    draftRef.current = next;
    setDraft(next);
  }

  async function commit() {
    const next = draftRef.current.trim();
    if (next === saved.trim()) {
      setDraftValue(saved);
      return;
    }
    const previousSaved = saved;
    const previousDraft = draftRef.current;
    const id = ++requestId.current;
    setError(null);
    setSaving(true);
    try {
      const result = await saveInlineField({ clientId, field, value: next });
      if (id !== requestId.current) return;
      if (!result.ok) {
        setSaved(previousSaved);
        if (draftRef.current === previousDraft) setDraftValue(previousDraft);
        setError(saveFailedLabel);
        return;
      }
      const stored = result.value ?? "";
      setSaved(stored);
      if (draftRef.current.trim() === next) setDraftValue(stored);
    } catch {
      if (id !== requestId.current) return;
      setSaved(previousSaved);
      if (draftRef.current === previousDraft) setDraftValue(previousDraft);
      setError(saveFailedLabel);
    } finally {
      if (id === requestId.current) setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        aria-label={ariaLabel}
        value={draft}
        maxLength={2000}
        disabled={saving}
        placeholder="—"
        autoComplete="off"
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={() => {
          if (skipCommit.current) {
            skipCommit.current = false;
            return;
          }
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            skipCommit.current = true;
            setDraftValue(saved);
            setError(null);
            event.currentTarget.blur();
          }
        }}
        className={controlClass}
      />
      {error ? (
        <p className="text-[10px] text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
