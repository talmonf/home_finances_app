"use client";

type Option = { id: string; label: string };

export function FilterCheckboxDropdown({
  name,
  label,
  anyLabel,
  options,
  selectedIds,
  onChange,
  selectedCountTemplate,
}: {
  name: string;
  label: string;
  anyLabel: string;
  options: Option[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  selectedCountTemplate: string;
}) {
  const summaryText =
    selectedIds.size === 0
      ? anyLabel
      : selectedIds.size === 1
        ? options.find((option) => selectedIds.has(option.id))?.label ?? anyLabel
        : selectedCountTemplate.replace("{count}", String(selectedIds.size));

  return (
    <div className="flex-none">
      <span className="block text-[11px] leading-4 text-slate-400">{label}</span>
      <details className="relative">
        <summary className="mt-0.5 w-auto min-w-[7.5rem] max-w-[11rem] cursor-pointer list-none rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 [&::-webkit-details-marker]:hidden">
          <span className="block truncate">{summaryText}</span>
        </summary>
        <div className="absolute z-20 mt-1 max-h-48 min-w-[10rem] overflow-y-auto rounded-md border border-slate-600 bg-slate-800 p-2 shadow-lg">
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
      </details>
    </div>
  );
}
