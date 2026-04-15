"use client";

export function OpenPrivateClinicTreatmentsImportButton({
  label,
  importPath,
}: {
  label: string;
  importPath: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.open(importPath, "_blank");
      }}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      {label}
    </button>
  );
}
