"use client";

import { LoadingSpinner } from "@/components/loading-spinner";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type PrivateClinicNavClientItem = {
  key: string;
  href: string;
  label: string;
  placement?: "primary" | "more";
  reminderBadgeCount?: number | null;
  reminderBadgeAriaLabel?: string;
};

type PrivateClinicNavClientProps = {
  navAriaLabel: string;
  moreMenuLabel: string;
  items: PrivateClinicNavClientItem[];
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export default function PrivateClinicNavClient({
  navAriaLabel,
  moreMenuLabel,
  items,
}: PrivateClinicNavClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = useMemo(() => normalizePathname(pathname ?? ""), [pathname]);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const moreMenuContainerRef = useRef<HTMLDivElement | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [normalizedPathname]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) return;
      if (!moreMenuContainerRef.current?.contains(targetNode)) {
        setIsMoreOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isMoreOpen]);

  const primaryItems = items.filter((item) => (item.placement ?? "primary") === "primary");
  const moreItems = items.filter((item) => (item.placement ?? "primary") === "more");
  const hasActiveMoreItem = moreItems.some(
    (item) => normalizedPathname === normalizePathname(item.href),
  );

  const linkClassName = (isActive: boolean) =>
    isActive
      ? "inline-flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-sm text-sky-100 ring-1 ring-sky-400/60"
      : "inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800";

  const renderItemLink = (item: PrivateClinicNavClientItem) => {
    const normalizedHref = normalizePathname(item.href);
    const isActive = normalizedPathname === normalizedHref;
    const isTargetPendingNavigation = pendingHref === normalizedHref;
    const showNavSpinner = isTargetPendingNavigation;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        aria-busy={showNavSpinner}
        onClick={(event) => {
          setIsMoreOpen(false);
          if (
            isActive ||
            isTargetPendingNavigation ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return;
          }
          event.preventDefault();
          setPendingHref(normalizedHref);
          // Defer navigation one frame so the spinner reliably paints in the tab before route transition.
          requestAnimationFrame(() => {
            startTransition(() => {
              router.push(item.href);
            });
          });
        }}
        className={linkClassName(isActive)}
      >
        {showNavSpinner ? <LoadingSpinner className="mr-1.5 h-3.5 w-3.5 shrink-0 text-current" /> : null}
        <span>{item.label}</span>
        {item.key === "reminders" && item.reminderBadgeCount != null && item.reminderBadgeCount > 0 ? (
          <span
            className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-slate-600/70 px-1 text-[10px] font-semibold text-slate-100 tabular-nums"
            aria-label={item.reminderBadgeAriaLabel}
          >
            {item.reminderBadgeCount > 99 ? "99+" : item.reminderBadgeCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-slate-800 pb-3"
      aria-label={navAriaLabel}
    >
      {primaryItems.map((item) => renderItemLink(item))}
      {moreItems.length > 0 ? (
        <div ref={moreMenuContainerRef} className="relative">
          <button
            type="button"
            aria-expanded={isMoreOpen}
            className={
              hasActiveMoreItem
                ? "inline-flex cursor-pointer list-none items-center rounded-lg bg-sky-500/20 px-3 py-1.5 text-sm text-sky-100 ring-1 ring-sky-400/60"
                : "inline-flex cursor-pointer list-none items-center rounded-lg bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700 hover:bg-slate-800"
            }
            onClick={() => setIsMoreOpen((prev) => !prev)}
          >
            {moreMenuLabel}
          </button>
          {isMoreOpen ? (
            <div className="absolute z-30 mt-2 flex min-w-52 flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900/95 p-2 shadow-xl">
              {moreItems.map((item) => renderItemLink(item))}
            </div>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
