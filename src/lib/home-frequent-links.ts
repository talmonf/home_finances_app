import type { DashboardSection, SectionId } from "@/lib/dashboard-sections";

export const HOME_FREQUENT_LINK_KEYS = [
  "reportTreatment",
  "reportReceipt",
  "upcomingAppointments",
  "upcomingRenewals",
  "riseUpImport",
] as const;

export type HomeFrequentLinkKey = (typeof HOME_FREQUENT_LINK_KEYS)[number];

/** Labels for super-admin household settings (English). */
export const HOME_FREQUENT_LINK_ADMIN_LABELS: Record<HomeFrequentLinkKey, string> = {
  reportTreatment: "Report treatment",
  reportReceipt: "Report receipt",
  upcomingAppointments: "Upcoming appointments",
  upcomingRenewals: "Upcoming renewals",
  riseUpImport: "RiseUp import",
};

const DEFAULT_ENABLED: Record<HomeFrequentLinkKey, boolean> = {
  reportTreatment: true,
  reportReceipt: true,
  upcomingAppointments: true,
  upcomingRenewals: true,
  riseUpImport: true,
};

/** Target routes; visibility still gated by household feature toggles and enabled sections. */
const LINK_HREF: Record<HomeFrequentLinkKey, string> = {
  reportTreatment: "/dashboard/private-clinic/treatments?modal=new",
  reportReceipt: "/dashboard/private-clinic/receipts?modal=new",
  upcomingAppointments: "/dashboard/private-clinic/appointments",
  upcomingRenewals: "/dashboard/upcoming-renewals",
  riseUpImport: "/dashboard/private-clinic/import-export",
};

const REQUIRES_SECTION: Record<HomeFrequentLinkKey, SectionId | null> = {
  reportTreatment: "privateClinic",
  reportReceipt: "privateClinic",
  upcomingAppointments: "privateClinic",
  upcomingRenewals: "upcomingRenewals",
  riseUpImport: "privateClinic",
};

export function parseHomeFrequentLinksJson(raw: unknown): Record<HomeFrequentLinkKey, boolean> {
  const out: Record<HomeFrequentLinkKey, boolean> = { ...DEFAULT_ENABLED };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const o = raw as Record<string, unknown>;
  for (const key of HOME_FREQUENT_LINK_KEYS) {
    if (typeof o[key] === "boolean") {
      out[key] = o[key];
    }
  }
  return out;
}

export type HomeFrequentLinkItem = {
  key: HomeFrequentLinkKey;
  href: string;
  label: string;
};

function labelFor(key: HomeFrequentLinkKey, language: "en" | "he"): string {
  if (language === "he") {
    const he: Record<HomeFrequentLinkKey, string> = {
      reportTreatment: "דיווח טיפול",
      reportReceipt: "דיווח קבלה",
      upcomingAppointments: "תורים קרובים",
      upcomingRenewals: "חידושים קרובים",
      riseUpImport: "ייבוא RiseUp",
    };
    return he[key];
  }
  const en: Record<HomeFrequentLinkKey, string> = {
    reportTreatment: "Report treatment",
    reportReceipt: "Report receipt",
    upcomingAppointments: "Upcoming appointments",
    upcomingRenewals: "Upcoming renewals",
    riseUpImport: "RiseUp import",
  };
  return en[key];
}

/**
 * Frequent links target mixed household workflows (clinic + renewals, etc.). When the only enabled
 * dashboard section is Private clinic, users use the clinic area as home (see `/` redirect); shortcuts
 * are not shown and household settings hide the toggles.
 */
export function homeFrequentLinksApplyToVisibleDashboard(
  visibleSections: Pick<DashboardSection, "id">[],
): boolean {
  if (visibleSections.length === 0) return false;
  if (visibleSections.length === 1 && visibleSections[0].id === "privateClinic") {
    return false;
  }
  return true;
}

/** Ordered shortcuts that are enabled in household settings and whose target section is enabled for the user. */
export function homeFrequentLinksSectionTitle(language: "en" | "he"): string {
  return language === "he" ? "קישורים מועדפים" : "Frequent links";
}

export function getVisibleHomeFrequentLinks(args: {
  rawJson: unknown;
  enabledBySectionId: Map<string, boolean>;
  language: "en" | "he";
}): HomeFrequentLinkItem[] {
  const toggles = parseHomeFrequentLinksJson(args.rawJson);
  const items: HomeFrequentLinkItem[] = [];
  for (const key of HOME_FREQUENT_LINK_KEYS) {
    if (!toggles[key]) continue;
    const sectionId = REQUIRES_SECTION[key];
    if (sectionId !== null && !(args.enabledBySectionId.get(sectionId) ?? true)) {
      continue;
    }
    items.push({
      key,
      href: LINK_HREF[key],
      label: labelFor(key, args.language),
    });
  }
  return items;
}
