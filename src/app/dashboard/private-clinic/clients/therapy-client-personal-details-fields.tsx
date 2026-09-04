"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { OBFUSCATED } from "@/lib/privacy-display";

const inputClass = "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100";

type Labels = {
  personalDetailsBtn: string;
  personalDetailsTitle: string;
  personalDetailsOnFile: string;
  personalDetailsDone: string;
  lastNameOptional: string;
  idOptional: string;
  email: string;
  composeEmail: string;
  callNumber: string;
  mobilePhone: string;
  homePhone: string;
  address: string;
};

export function TherapyClientPersonalDetailsFields({
  idPrefix,
  obfuscate,
  lastName,
  idNumber,
  email,
  mobilePhone,
  homePhone,
  address,
  hasDetailsOnFile,
  labels,
}: {
  idPrefix: string;
  obfuscate: boolean;
  lastName: string;
  idNumber: string;
  email: string;
  mobilePhone: string;
  homePhone: string;
  address: string;
  hasDetailsOnFile: boolean;
  labels: Labels;
}) {
  const [open, setOpen] = useState(false);
  const [hintVisible, setHintVisible] = useState(hasDetailsOnFile);
  const titleId = useId();

  const close = useCallback(() => {
    if (!obfuscate) {
      const filled = [
        document.getElementById(`${idPrefix}_last_name`) as HTMLInputElement | null,
        document.getElementById(`${idPrefix}_id_number`) as HTMLInputElement | null,
        document.getElementById(`${idPrefix}_email`) as HTMLInputElement | null,
        document.getElementById(`${idPrefix}_mobile_phone`) as HTMLInputElement | null,
        document.getElementById(`${idPrefix}_home_phone`) as HTMLInputElement | null,
        document.getElementById(`${idPrefix}_address`) as HTMLInputElement | null,
      ].some((el) => Boolean(el?.value.trim()));
      setHintVisible(filled);
    }
    setOpen(false);
  }, [idPrefix, obfuscate]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-fit rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
      >
        {labels.personalDetailsBtn}
      </button>
      {hintVisible ? <span className="text-xs text-slate-500">{labels.personalDetailsOnFile}</span> : null}

      <div
        className={`fixed inset-0 z-[60] flex items-start justify-center overflow-auto bg-slate-950/80 px-4 py-8 ${open ? "" : "hidden"}`}
        onClick={close}
        role="presentation"
        inert={!open ? true : undefined}
      >
        <div
          role="dialog"
          aria-modal={open}
          aria-labelledby={titleId}
          aria-hidden={!open}
          className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold text-slate-50">
              {labels.personalDetailsTitle}
            </h2>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              {labels.personalDetailsDone}
            </button>
          </div>

          <div className="grid items-start gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor={`${idPrefix}_last_name`} className="block text-xs text-slate-400">
                {labels.lastNameOptional}
              </label>
              {obfuscate ? <input type="hidden" name="last_name" value={lastName} /> : null}
              {obfuscate ? (
                <input id={`${idPrefix}_last_name`} readOnly value={OBFUSCATED} className={inputClass} />
              ) : (
                <input id={`${idPrefix}_last_name`} name="last_name" defaultValue={lastName} className={inputClass} />
              )}
            </div>

            <div className="space-y-1">
              <label htmlFor={`${idPrefix}_id_number`} className="block text-xs text-slate-400">
                {labels.idOptional}
              </label>
              {obfuscate ? <input type="hidden" name="id_number" value={idNumber} /> : null}
              {obfuscate ? (
                <input id={`${idPrefix}_id_number`} readOnly value={idNumber ? OBFUSCATED : ""} className={inputClass} />
              ) : (
                <input id={`${idPrefix}_id_number`} name="id_number" defaultValue={idNumber} className={inputClass} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${idPrefix}_email`} className="block text-xs text-slate-400">
                  {labels.email}
                </label>
                {email && !obfuscate ? (
                  <a href={`mailto:${email}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
                    {labels.composeEmail}
                  </a>
                ) : null}
              </div>
              {obfuscate ? <input type="hidden" name="email" value={email} /> : null}
              {obfuscate ? (
                <input id={`${idPrefix}_email`} readOnly value={email ? OBFUSCATED : ""} className={inputClass} />
              ) : (
                <input id={`${idPrefix}_email`} name="email" type="email" defaultValue={email} className={inputClass} />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${idPrefix}_mobile_phone`} className="block text-xs text-slate-400">
                  {labels.mobilePhone}
                </label>
                {mobilePhone && !obfuscate ? (
                  <a href={`tel:${mobilePhone}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
                    {labels.callNumber}
                  </a>
                ) : null}
              </div>
              {obfuscate ? (
                <>
                  <input type="hidden" name="mobile_phone" value={mobilePhone} />
                  <input
                    id={`${idPrefix}_mobile_phone`}
                    readOnly
                    value={mobilePhone ? OBFUSCATED : ""}
                    className={inputClass}
                  />
                </>
              ) : (
                <input
                  id={`${idPrefix}_mobile_phone`}
                  name="mobile_phone"
                  defaultValue={mobilePhone}
                  className={inputClass}
                />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor={`${idPrefix}_home_phone`} className="block text-xs text-slate-400">
                  {labels.homePhone}
                </label>
                {homePhone && !obfuscate ? (
                  <a href={`tel:${homePhone}`} className="shrink-0 text-xs text-sky-400 hover:text-sky-300">
                    {labels.callNumber}
                  </a>
                ) : null}
              </div>
              {obfuscate ? (
                <>
                  <input type="hidden" name="home_phone" value={homePhone} />
                  <input
                    id={`${idPrefix}_home_phone`}
                    readOnly
                    value={homePhone ? OBFUSCATED : ""}
                    className={inputClass}
                  />
                </>
              ) : (
                <input id={`${idPrefix}_home_phone`} name="home_phone" defaultValue={homePhone} className={inputClass} />
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label htmlFor={`${idPrefix}_address`} className="block text-xs text-slate-400">
                {labels.address}
              </label>
              {obfuscate ? <input type="hidden" name="address" value={address} /> : null}
              {obfuscate ? (
                <input id={`${idPrefix}_address`} readOnly value={address ? OBFUSCATED : ""} className={inputClass} />
              ) : (
                <input id={`${idPrefix}_address`} name="address" defaultValue={address} className={inputClass} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
