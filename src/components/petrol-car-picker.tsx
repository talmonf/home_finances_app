"use client";

import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_BASE = "/dashboard/petrol-fillups";

export function PetrolCarPicker({
  options,
  selectedCarId,
  basePath = DEFAULT_BASE,
  vehicleLabel = "Vehicle",
  selectPlaceholder = "Select a vehicle…",
}: {
  options: { id: string; label: string }[];
  selectedCarId: string | null;
  /** Defaults to household petrol-fillups page */
  basePath?: string;
  vehicleLabel?: string;
  selectPlaceholder?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300" htmlFor="petrol-car-picker">
        {vehicleLabel}
      </label>
      <select
        id="petrol-car-picker"
        value={selectedCarId ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          const p = new URLSearchParams(searchParams.toString());
          p.delete("saved");
          p.delete("deleted");
          p.delete("error");
          p.delete("edit");
          p.delete("vehicleEdit");
          p.delete("vehicleSaved");
          p.delete("vehicleUpdated");
          p.delete("vehicleDeleted");
          if (v) p.set("carId", v);
          else p.delete("carId");
          const q = p.toString();
          router.push(q ? `${basePath}?${q}` : basePath);
        }}
        className="w-full min-h-[52px] rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-base text-slate-100 shadow-inner shadow-slate-950/40 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
      >
        <option value="">{selectPlaceholder}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
