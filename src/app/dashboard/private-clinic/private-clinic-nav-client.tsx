"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PrivateClinicNavClientItem = {
  key: string;
  href: string;
  label: string;
  reminderBadgeCount?: number | null;
  reminderBadgeAriaLabel?: string;
};

type PrivateClinicNavClientProps = {
  navAriaLabel: string;
  items: PrivateClinicNavClientItem[];
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export default function PrivateClinicNavClient({
  navAriaLabel,
  items,
}: PrivateClinicNavClientProps) {
  const pathname = usePathname();
  const normalizedPathname = useMemo(() => normalizePathname(pathname ?? ""), [pathname]);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingHref) return;
    if (normalizePathname(pendingHref) === normalizedPathname) {
      setPendingHref(null);
    }
  }, [normalizedPathname, pendingHref]);

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
      aria-label={navAriaLabel}
    >
      {items.map((item) => {
        const normalizedHref = normalizePathname(item.href);
        const isActive = normalizedPathname === normalizedHref;
        const isPending = pendingHref === item.href;
        const className = isActive
          ? "inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-sm text-sky-100 ring-1 ring-sky-400/60"
          : isPending
            ? "inline-flex items-center gap-1.5 rounded-lg bg-slate-700/90 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-slate-500"
            : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800";

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            onClick={() => {
              if (!isActive) setPendingHref(item.href);
            }}
            className={className}
          >
            {isPending ? (
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-transparent"
                aria-hidden
              />
            ) : null}
            <span>{item.label}</span>
            {item.key === "reminders" &&
            item.reminderBadgeCount != null &&
            item.reminderBadgeCount > 0 ? (
              <span
                className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600/90 px-1 text-[10px] font-semibold text-white tabular-nums"
                aria-label={item.reminderBadgeAriaLabel}
              >
                {item.reminderBadgeCount > 99 ? "99+" : item.reminderBadgeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
