"use client";

import { useRef } from "react";

type Option = { id: string; label: string };

export function FilterCheckboxDropdown({
  name,
  label,
  anyLabel,
  options,
  selectedIds,
  onChange,
  selectedCountTemplate,
  selectAllLabel,
  deselectAllLabel,
  doneLabel,
  closeHint,
}: {
  name: string;
  label: string;
  anyLabel: string;
  options: Option[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  selectedCountTemplate: string;
  selectAllLabel: string;
  deselectAllLabel: string;
  doneLabel: string;
  closeHint?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const summaryText =
    selectedIds.size === 0
      ? anyLabel
      : selectedIds.size === 1
        ? options.find((option) => selectedIds.has(option.id))?.label ?? anyLabel
        : selectedCountTemplate.replace("{count}", String(selectedIds.size));

  function closeDropdown() {
    if (detailsRef.current) detailsRef.current.open = false;
  }

  return (
    <div className="flex-none">
      <span className="block text-[11px] leading-4 text-slate-400">{label}</span>
      <details ref={detailsRef} className="group relative">
        <summary className="mt-0.5 flex w-auto min-w-[7.5rem] max-w-[11rem] cursor-pointer list-none items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 truncate">{summaryText}</span>
          <span
            className="shrink-0 text-[10px] text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            ▼
          </span>
        </summary>
        <div className="absolute z-20 mt-1 flex min-w-[12rem] max-w-[16rem] flex-col rounded-md border border-slate-600 bg-slate-800 shadow-lg">
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-slate-700 px-2 py-1.5">
            <button
              type="button"
              onClick={() => onChange(new Set(options.map((option) => option.id)))}
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange(new Set())}
              className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
            >
              {deselectAllLabel}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            {options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-slate-100">
                <input
                  type="checkbox"
                  name={name}
                  value={option.id}
                  checked={selectedIds.has(option.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(option.id);
                    else next.delete(option.id);
                    onChange(next);
                  }}
                  className="rounded border-slate-500"
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="border-t border-slate-700 px-2 py-1.5">
            <button
              type="button"
              onClick={closeDropdown}
              className="w-full rounded-md bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
            >
              {doneLabel}
            </button>
            {closeHint ? <p className="mt-1 text-[10px] leading-4 text-slate-500">{closeHint}</p> : null}
          </div>
        </div>
      </details>
    </div>
  );
}
