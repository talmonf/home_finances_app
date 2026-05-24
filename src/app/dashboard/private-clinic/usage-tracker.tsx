"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pathnameToPrivateClinicFeature } from "@/lib/usage-audit/catalog";

const CLIENT_DEBOUNCE_MS = 15 * 60 * 1000;

export default function PrivateClinicUsageTracker() {
  const pathname = usePathname();
  const lastSentRef = useRef<{ feature: string; at: number } | null>(null);

  useEffect(() => {
    const feature = pathnameToPrivateClinicFeature(pathname);
    if (!feature) return;

    const now = Date.now();
    const last = lastSentRef.current;
    if (last && last.feature === feature && now - last.at < CLIENT_DEBOUNCE_MS) {
      return;
    }

    lastSentRef.current = { feature, at: now };

    void fetch("/api/usage/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain: "private_clinic",
        event_type: "visit",
        feature,
        pathname,
      }),
    }).catch(() => {
      // Non-blocking; ignore network errors
    });
  }, [pathname]);

  return null;
}
