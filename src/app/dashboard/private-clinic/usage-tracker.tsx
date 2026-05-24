"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pathnameToPrivateClinicFeature } from "@/lib/usage-audit/catalog";
import { postPrivateClinicUsageVisit } from "@/lib/usage-audit/track-client";

/** Debounce repeat visits to the same section (reloads, query-only changes). */
const SAME_FEATURE_DEBOUNCE_MS = 2 * 60 * 1000;

export default function PrivateClinicUsageTracker() {
  const pathname = usePathname();
  const lastLoggedFeatureRef = useRef<string | null>(null);
  const lastSameFeatureAtRef = useRef<number>(0);

  useEffect(() => {
    const feature = pathnameToPrivateClinicFeature(pathname);
    if (!feature) return;

    const now = Date.now();
    const featureChanged = lastLoggedFeatureRef.current !== feature;

    if (!featureChanged && now - lastSameFeatureAtRef.current < SAME_FEATURE_DEBOUNCE_MS) {
      return;
    }

    lastLoggedFeatureRef.current = feature;
    lastSameFeatureAtRef.current = now;

    postPrivateClinicUsageVisit(feature, pathname);
  }, [pathname]);

  return null;
}
