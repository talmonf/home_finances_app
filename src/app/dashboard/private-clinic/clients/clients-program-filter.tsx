"use client";

import { useState } from "react";
import { FilterCheckboxDropdown } from "@/components/filter-checkbox-dropdown";

type Option = { id: string; label: string };

export function ClientsProgramFilter({
  options,
  selectedIds,
  labels,
}: {
  options: Option[];
  selectedIds: string[];
  labels: {
    program: string;
    any: string;
    selectedCountTemplate: string;
    selectAll: string;
    deselectAll: string;
    done: string;
    closeHint: string;
  };
}) {
  const [selected, setSelected] = useState(() => new Set(selectedIds));

  return (
    <FilterCheckboxDropdown
      name="program"
      label={labels.program}
      anyLabel={labels.any}
      options={options}
      selectedIds={selected}
      onChange={setSelected}
      selectedCountTemplate={labels.selectedCountTemplate}
      selectAllLabel={labels.selectAll}
      deselectAllLabel={labels.deselectAll}
      doneLabel={labels.done}
      closeHint={labels.closeHint}
      className="min-w-0 grow basis-44"
      summaryClassName="mt-0.5 flex h-9 w-full min-w-[8rem] cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 text-sm text-slate-100 [&::-webkit-details-marker]:hidden"
    />
  );
}
