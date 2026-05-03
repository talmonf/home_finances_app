"use client";

import {
  privateClinicOverviewCardLabel,
  type PrivateClinicOverviewStatId,
} from "@/lib/private-clinic-i18n";
import type { UiLanguage } from "@/lib/ui-language";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  normalizePrivateClinicHrefPath,
  normalizePrivateClinicPathname,
  usePrivateClinicNavPending,
} from "./private-clinic-nav-pending-context";

export type PrivateClinicOverviewCardPayload = {
  id: PrivateClinicOverviewStatId;
  href: string;
  value: number;
  subValue?: string;
};

export default function PrivateClinicOverviewCardsClient({
  cards,
  uiLanguage,
}: {
  cards: PrivateClinicOverviewCardPayload[];
  uiLanguage: UiLanguage;
}) {
  const pathname = usePathname();
  const normalizedPathname = useMemo(() => normalizePrivateClinicPathname(pathname ?? ""), [pathname]);
  const { pendingHref, pushWithPending } = usePrivateClinicNavPending();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => {
        const normalizedHref = normalizePrivateClinicHrefPath(c.href);
        const isActive = normalizedPathname === normalizedHref;
        const showPending = pendingHref === normalizedHref;
        const label = privateClinicOverviewCardLabel(c.id, uiLanguage);

        return (
          <Link
            key={c.id}
            href={c.href}
            aria-label={label}
            aria-busy={showPending}
            onClick={(event) => {
              if (
                isActive ||
                showPending ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              ) {
                return;
              }
              event.preventDefault();
              pushWithPending(c.href);
            }}
            className="block rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 ring-1 ring-slate-800 transition hover:border-slate-600 hover:bg-slate-900 hover:ring-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
          >
            <p
              className={`text-xs tracking-wide text-slate-500 ${uiLanguage === "he" ? "normal-case" : "uppercase"}`}
            >
              {label}
            </p>
            <p className="text-2xl font-semibold text-slate-100">{c.value}</p>
            {c.subValue != null ? <p className="mt-1 text-xs text-slate-400">{c.subValue}</p> : null}
          </Link>
        );
      })}
    </div>
  );
}
