"use client";

import { useMemo, useState } from "react";

type AllocationItem = {
  id: string;
  label: string;
  suggested: boolean;
  selectable: boolean;
};

export function ReceiptAllocationPicker({
  inputName,
  items,
  selectAllLabel,
  deselectAllLabel,
  selectSuggestedLabel,
}: {
  inputName: string;
  items: AllocationItem[];
  selectAllLabel: string;
  deselectAllLabel: string;
  selectSuggestedLabel: string;
}) {
  const selectableIds = useMemo(() => items.filter((item) => item.selectable).map((item) => item.id), [items]);
  const suggestedIds = useMemo(
    () => items.filter((item) => item.selectable && item.suggested).map((item) => item.id),
    [items],
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(suggestedIds));

  const canSelectAll = selectableIds.length > 0;
  const canSelectSuggested = suggestedIds.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSelectAll}
          onClick={() => setSelectedIds(new Set(selectableIds))}
          className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectAllLabel}
        </button>
        <button
          type="button"
          onClick={() => setSelectedIds(new Set())}
          className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
        >
          {deselectAllLabel}
        </button>
        <button
          type="button"
          disabled={!canSelectSuggested}
          onClick={() => setSelectedIds(new Set(suggestedIds))}
          className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {selectSuggestedLabel}
        </button>
      </div>

      <div className="max-h-52 space-y-1 overflow-auto rounded border border-slate-700 p-2">
        {items.map((item) => {
          const checked = selectedIds.has(item.id);
          return (
            <label key={item.id} className={`flex items-center gap-2 ${item.selectable ? "" : "opacity-60"}`}>
              <input
                type="checkbox"
                name={inputName}
                value={item.id}
                checked={checked}
                disabled={!item.selectable}
                onChange={(event) => {
                  const isChecked = event.target.checked;
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (isChecked) next.add(item.id);
                    else next.delete(item.id);
                    return next;
                  });
                }}
              />
              <span>{item.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
