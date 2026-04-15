import Link from "next/link";

export function OpenPrivateClinicTreatmentsImportButton({
  label,
  importPath,
}: {
  label: string;
  importPath: string;
}) {
  return (
    <Link
      href={importPath}
      className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
    >
      {label}
    </Link>
  );
}
