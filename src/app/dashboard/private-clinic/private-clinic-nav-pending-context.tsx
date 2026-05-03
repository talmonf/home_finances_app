"use client";

import {
  PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT,
  type PrivateClinicNavSegmentReadyDetail,
} from "@/lib/private-clinic-nav-segment-ready";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

export function normalizePrivateClinicPathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** `usePathname()` omits query/hash — normalize link targets to path-only. */
export function normalizePrivateClinicHrefPath(href: string): string {
  const pathOnly = href.split("?")[0]?.split("#")[0] ?? href;
  return normalizePrivateClinicPathname(pathOnly);
}

/** Tab targets where `useTransition` ends before slow RSC has finished — clear pending via segment-ready only. */
const NAV_CLEAR_PENDING_AFTER_SEGMENT_READY = new Set([
  normalizePrivateClinicHrefPath("/dashboard/private-clinic/consultations"),
  normalizePrivateClinicHrefPath("/dashboard/private-clinic/clients"),
]);

type PrivateClinicNavPendingContextValue = {
  pendingHref: string | null;
  /** Primary same-tab navigation with tab pending state (matches nav link behavior). */
  pushWithPending: (href: string) => void;
};

const PrivateClinicNavPendingContext = createContext<PrivateClinicNavPendingContextValue | null>(null);

export function PrivateClinicNavPendingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const normalizedPathname = useMemo(() => normalizePrivateClinicPathname(pathname ?? ""), [pathname]);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pendingHrefRef = useRef<string | null>(null);
  pendingHrefRef.current = pendingHref;
  const [isTransitionPending, startTransition] = useTransition();

  useEffect(() => {
    if (!pendingHref) return;
    const pendingNorm = normalizePrivateClinicHrefPath(pendingHref);
    if (pendingNorm === normalizedPathname) {
      if (NAV_CLEAR_PENDING_AFTER_SEGMENT_READY.has(pendingNorm)) return;
      queueMicrotask(() => setPendingHref(null));
      return;
    }
    if (isTransitionPending) return;
    queueMicrotask(() => setPendingHref(null));
  }, [normalizedPathname, pendingHref, isTransitionPending]);

  useEffect(() => {
    const onSegmentReady = (e: Event) => {
      const detail = (e as CustomEvent<PrivateClinicNavSegmentReadyDetail>).detail;
      if (!detail?.path) return;
      const arrivedNorm = normalizePrivateClinicHrefPath(detail.path);
      setPendingHref((prev) => {
        if (prev != null && normalizePrivateClinicHrefPath(prev) === arrivedNorm) return null;
        return prev;
      });
    };
    window.addEventListener(PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT, onSegmentReady);
    return () => window.removeEventListener(PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT, onSegmentReady);
  }, []);

  useEffect(() => {
    if (!pendingHref) return;
    const pn = normalizePrivateClinicHrefPath(pendingHref);
    if (!NAV_CLEAR_PENDING_AFTER_SEGMENT_READY.has(pn)) return;
    const id = window.setTimeout(() => setPendingHref(null), 120_000);
    return () => window.clearTimeout(id);
  }, [pendingHref]);

  const pushWithPending = useCallback(
    (href: string) => {
      const normalizedHref = normalizePrivateClinicHrefPath(href);
      if (normalizedHref === normalizedPathname) return;
      const prev = pendingHrefRef.current;
      if (prev != null && normalizePrivateClinicHrefPath(prev) === normalizedHref) return;
      setPendingHref(normalizedHref);
      startTransition(() => {
        router.push(href);
      });
    },
    [normalizedPathname, router],
  );

  const value = useMemo(
    () => ({ pendingHref, pushWithPending }),
    [pendingHref, pushWithPending],
  );

  return (
    <PrivateClinicNavPendingContext.Provider value={value}>{children}</PrivateClinicNavPendingContext.Provider>
  );
}

export function usePrivateClinicNavPending(): PrivateClinicNavPendingContextValue {
  const ctx = useContext(PrivateClinicNavPendingContext);
  if (!ctx) {
    throw new Error("usePrivateClinicNavPending must be used within PrivateClinicNavPendingProvider");
  }
  return ctx;
}
