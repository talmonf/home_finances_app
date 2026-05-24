import {
  PRIVATE_CLINIC_NAV_ITEMS,
  type PrivateClinicNavKey,
} from "@/lib/private-clinic-nav";
import type { HomeFrequentLinkKey } from "@/lib/home-frequent-links";
import {
  formatInstantInIsraelTime,
  type HouseholdDateDisplayFormat,
} from "@/lib/household-date-format";

export const USAGE_DOMAIN_PRIVATE_CLINIC = "private_clinic" as const;
export type UsageDomain = typeof USAGE_DOMAIN_PRIVATE_CLINIC;

export const USAGE_EVENT_VISIT = "visit" as const;
export const USAGE_EVENT_ACTION = "action" as const;
export type UsageEventType = typeof USAGE_EVENT_VISIT | typeof USAGE_EVENT_ACTION;

const PRIVATE_CLINIC_BASE = "/dashboard/private-clinic";

/** Longest-prefix match: pathname → nav feature key. */
export function pathnameToPrivateClinicFeature(pathname: string): PrivateClinicNavKey | null {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (!normalized.startsWith(PRIVATE_CLINIC_BASE)) return null;

  if (normalized === PRIVATE_CLINIC_BASE) return "overview";

  let best: { key: PrivateClinicNavKey; hrefLen: number } | null = null;
  for (const item of PRIVATE_CLINIC_NAV_ITEMS) {
    if (item.key === "overview") continue;
    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      const hrefLen = item.href.length;
      if (!best || hrefLen > best.hrefLen) {
        best = { key: item.key, hrefLen };
      }
    }
  }
  return best?.key ?? null;
}

export const PRIVATE_CLINIC_FEATURE_KEYS: PrivateClinicNavKey[] = PRIVATE_CLINIC_NAV_ITEMS.map(
  (i) => i.key,
);

export function privateClinicFeatureLabel(key: PrivateClinicNavKey): string {
  const item = PRIVATE_CLINIC_NAV_ITEMS.find((i) => i.key === key);
  return item?.label ?? key;
}

/** Maps `general_audit_events.feature` values to private-clinic nav keys. */
/** Home dashboard shortcuts → clinic feature for usage tracking. */
export function homeFrequentLinkToClinicFeature(
  key: HomeFrequentLinkKey,
): PrivateClinicNavKey | null {
  switch (key) {
    case "privateClinic":
      return "overview";
    case "reportTreatment":
      return "treatments";
    case "reportReceipt":
      return "receipts";
    case "upcomingVisits":
      return "upcomingVisits";
    case "upcomingAppointments":
      return "appointments";
    default:
      return null;
  }
}

export function formatUsageAuditTimestamp(
  d: Date,
  format: HouseholdDateDisplayFormat = "DMY",
): string {
  return formatInstantInIsraelTime(d, format);
}

export function formatUsageResourceLines(
  resourceType: string | null,
  resourceId: string | null,
  metadata?: Record<string, unknown>,
): string[] {
  const lines: string[] = [];
  if (resourceType && resourceId) {
    lines.push(`${resourceType} · ${resourceId}`);
  }
  const treatmentId = metadata?.treatment_id;
  if (typeof treatmentId === "string" && treatmentId) {
    lines.push(`treatment · ${treatmentId}`);
  }
  const appointmentId = metadata?.appointment_id;
  if (
    typeof appointmentId === "string" &&
    appointmentId &&
    resourceId !== appointmentId
  ) {
    lines.push(`appointment · ${appointmentId}`);
  }
  return lines;
}

export function generalAuditFeatureToPrivateClinicNav(
  feature: string,
): PrivateClinicNavKey | null {
  switch (feature) {
    case "private_clinic_excel":
      return "importExport";
    case "private_clinic_month_payable":
      return "reports";
    case "private_clinic_backup":
      return "importExport";
    default:
      return null;
  }
}
