"use client";

import { useEffect } from "react";
import {
  PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT,
  type PrivateClinicNavSegmentReadyDetail,
} from "@/lib/private-clinic-nav-segment-ready";

/** Lets `PrivateClinicNavClient` keep the tab spinner until this slow segment has streamed + hydrated. */
export function PrivateClinicNavSegmentReporter({ path }: { path: string }) {
  useEffect(() => {
    const detail: PrivateClinicNavSegmentReadyDetail = { path };
    window.dispatchEvent(new CustomEvent(PRIVATE_CLINIC_NAV_SEGMENT_READY_EVENT, { detail }));
  }, [path]);
  return null;
}
