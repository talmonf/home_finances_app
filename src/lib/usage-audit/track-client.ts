import type { PrivateClinicNavKey } from "@/lib/private-clinic-nav";
import {
  USAGE_DOMAIN_PRIVATE_CLINIC,
  USAGE_EVENT_ACTION,
  USAGE_EVENT_VISIT,
} from "@/lib/usage-audit/catalog";

/** Fire-and-forget visit tracking from the browser. */
export function postPrivateClinicUsageVisit(
  feature: PrivateClinicNavKey,
  pathname: string,
  metadata?: Record<string, string>,
): void {
  void fetch("/api/usage/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      event_type: USAGE_EVENT_VISIT,
      feature,
      pathname,
      metadata,
    }),
  }).catch(() => {
    // Non-blocking
  });
}

/** Fire-and-forget action tracking from the browser (allowlisted server-side). */
export function postPrivateClinicUsageAction(
  feature: PrivateClinicNavKey,
  action: string,
  metadata?: Record<string, string>,
): void {
  void fetch("/api/usage/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain: USAGE_DOMAIN_PRIVATE_CLINIC,
      event_type: USAGE_EVENT_ACTION,
      feature,
      action,
      metadata,
    }),
  }).catch(() => {
    // Non-blocking
  });
}
