"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isClinicModulePath } from "@/lib/app-module-path";
import type { UiLanguage } from "@/lib/ui-language";

const activeModuleClass =
  "rounded-md bg-sky-500/20 px-2.5 py-1 font-semibold tracking-tight text-sky-50 ring-1 ring-sky-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";
const inactiveModuleClass =
  "rounded-md px-2.5 py-1 font-medium tracking-tight text-slate-400 hover:bg-slate-800 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60";

/**
 * The root layout does not re-render on client navigations, so the active module
 * has to follow `usePathname()` or the highlight stays on the first page loaded.
 */
export function ModuleBrandSwitcher({
  uiLanguage,
  clinicEnabled,
  homeTitle,
  clinicTitle,
}: {
  uiLanguage: UiLanguage;
  clinicEnabled: boolean;
  homeTitle: string;
  clinicTitle: string;
}) {
  const pathname = usePathname() ?? "";
  const clinicActive = isClinicModulePath(pathname, clinicEnabled);

  return (
    <nav
      aria-label={uiLanguage === "he" ? "מודולים" : "Modules"}
      className="flex flex-nowrap items-center gap-1 whitespace-nowrap"
    >
      <Link
        href="/"
        aria-current={clinicActive ? undefined : "page"}
        className={clinicActive ? inactiveModuleClass : activeModuleClass}
      >
        {homeTitle}
      </Link>
      <Link
        href="/dashboard/private-clinic"
        aria-current={clinicActive ? "page" : undefined}
        className={clinicActive ? activeModuleClass : inactiveModuleClass}
      >
        {clinicTitle}
      </Link>
    </nav>
  );
}

export function ClinicModuleUserGuideLink({ label }: { label: string }) {
  const pathname = usePathname() ?? "";
  if (!isClinicModulePath(pathname, true)) return null;

  return (
    <Link
      href="/dashboard/private-clinic/getting-started"
      className="rounded-md px-2 py-1 font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100"
    >
      {label}
    </Link>
  );
}
