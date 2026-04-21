import Link from "next/link";

type DashboardAddButtonProps = {
  href?: string;
  basePath?: string;
  modalParam?: string;
  label: string;
};

export function DashboardAddButton({
  href,
  basePath,
  modalParam = "new",
  label,
}: DashboardAddButtonProps) {
  const resolvedHref = href ?? (basePath ? `${basePath}?modal=${encodeURIComponent(modalParam)}` : "#");
  return (
    <Link
      href={resolvedHref}
      className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400"
    >
      {label}
    </Link>
  );
}
