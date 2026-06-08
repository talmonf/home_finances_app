"use client";

import { useMemo, useState, useTransition } from "react";
import {
  deleteTherapyConsultationType,
  saveTherapyConsultationTypeInline,
} from "../actions";
import { ConsultationTypeDeleteForm } from "./consultation-type-delete-form";

type ConsultationTypeEditRowProps = {
  id: string;
  initialName: string;
  initialNameHe: string;
  isActive: boolean;
  isSystem: boolean;
  usageCount: number;
  householdId?: string;
  labels: {
    fieldEnglish: string;
    fieldHebrew: string;
    save: string;
    remove: string;
    defaultTag: string;
    archivedTag: string;
    unsavedChanges: string;
    saved: string;
    saveFailed: string;
    saving: string;
    confirmRemove: string;
    confirmArchive: string;
  };
};

export function ConsultationTypeEditRow({
  id,
  initialName,
  initialNameHe,
  isActive,
  isSystem,
  usageCount,
  householdId,
  labels,
}: ConsultationTypeEditRowProps) {
  const [savedName, setSavedName] = useState(initialName);
  const [savedNameHe, setSavedNameHe] = useState(initialNameHe);
  const [name, setName] = useState(initialName);
  const [nameHe, setNameHe] = useState(initialNameHe);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(
    () => name.trim() !== savedName.trim() || nameHe.trim() !== savedNameHe.trim(),
    [name, nameHe, savedName, savedNameHe],
  );

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaveError(null);
    setJustSaved(false);
    startTransition(async () => {
      const result = await saveTherapyConsultationTypeInline(
        id,
        trimmedName,
        nameHe.trim() || null,
        householdId,
      );
      if (!result.ok) {
        setSaveError(labels.saveFailed);
        return;
      }
      setSavedName(trimmedName);
      setSavedNameHe(nameHe.trim());
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 2000);
    });
  };

  return (
    <li
      className={`rounded-lg border bg-slate-950/40 p-2.5 sm:p-3 ${
        !isActive
          ? "border-slate-800 opacity-60"
          : isDirty
            ? "border-amber-600/70 ring-1 ring-amber-600/30"
            : "border-slate-800"
      }`}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <label className="mb-1 block text-xs text-slate-500">{labels.fieldEnglish}</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">{labels.fieldHebrew}</label>
          <input
            name="name_he"
            value={nameHe}
            onChange={(e) => setNameHe(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          />
        </div>
        <div className="flex flex-col gap-1 sm:mt-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isPending || !name.trim()}
            className={`rounded-lg px-3 py-2 text-xs font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50 ${
              isDirty ? "bg-sky-600 hover:bg-sky-500" : "bg-slate-700 hover:bg-slate-600"
            }`}
          >
            {isPending ? labels.saving : labels.save}
          </button>
          {isDirty ? (
            <span className="text-[11px] text-amber-300">{labels.unsavedChanges}</span>
          ) : justSaved ? (
            <span className="text-[11px] text-emerald-300">{labels.saved}</span>
          ) : saveError ? (
            <span className="text-[11px] text-rose-300">{saveError}</span>
          ) : null}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-2">
        {isSystem ? <span className="text-xs text-slate-600">{labels.defaultTag}</span> : null}
        {!isActive ? (
          <span className="text-xs text-slate-600">{labels.archivedTag}</span>
        ) : (
          <ConsultationTypeDeleteForm
            action={deleteTherapyConsultationType}
            usageCount={usageCount}
            confirmRemove={labels.confirmRemove}
            confirmArchive={labels.confirmArchive}
            className="inline"
          >
            {householdId ? <input type="hidden" name="household_id" value={householdId} /> : null}
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-xs text-rose-400 hover:text-rose-300">
              {labels.remove}
            </button>
          </ConsultationTypeDeleteForm>
        )}
      </div>
    </li>
  );
}
