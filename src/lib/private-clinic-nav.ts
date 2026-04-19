export const PRIVATE_CLINIC_NAV_ITEMS = [
  { key: "overview", href: "/dashboard/private-clinic", label: "Overview" },
  { key: "jobs", href: "/dashboard/private-clinic/jobs", label: "Jobs" },
  { key: "programs", href: "/dashboard/private-clinic/programs", label: "Programs" },
  { key: "clients", href: "/dashboard/private-clinic/clients", label: "Clients" },
  {
    key: "upcomingVisits",
    href: "/dashboard/private-clinic/upcoming-visits",
    label: "Upcoming visits",
  },
  { key: "treatments", href: "/dashboard/private-clinic/treatments", label: "Treatments" },
  { key: "receipts", href: "/dashboard/private-clinic/receipts", label: "Receipts" },
  { key: "reports", href: "/dashboard/private-clinic/reports", label: "Reports" },
  { key: "expenses", href: "/dashboard/private-clinic/expenses", label: "Expenses" },
  { key: "appointments", href: "/dashboard/private-clinic/appointments", label: "Appointments" },
  { key: "consultations", href: "/dashboard/private-clinic/consultations", label: "Consultations" },
  { key: "travel", href: "/dashboard/private-clinic/travel", label: "Travel" },
  { key: "petrol", href: "/dashboard/private-clinic/petrol", label: "Petrol" },
  {
    key: "clinicInsurance",
    href: "/dashboard/private-clinic/clinic-insurance",
    label: "Clinic insurance",
  },
  {
    key: "workSubscriptions",
    href: "/dashboard/private-clinic/work-subscriptions",
    label: "Work subscriptions",
  },
  { key: "reminders", href: "/dashboard/private-clinic/reminders", label: "Reminders" },
  { key: "settings", href: "/dashboard/private-clinic/settings", label: "Settings" },
  { key: "importExport", href: "/dashboard/private-clinic/import-export", label: "Import / Export" },
] as const;

export type PrivateClinicNavKey = (typeof PRIVATE_CLINIC_NAV_ITEMS)[number]["key"];

const DEFAULT_VISIBILITY: Record<PrivateClinicNavKey, boolean> = Object.fromEntries(
  PRIVATE_CLINIC_NAV_ITEMS.map((i) => [i.key, true]),
) as Record<PrivateClinicNavKey, boolean>;

export function mergePrivateClinicNavVisibility(
  stored: unknown,
): Record<PrivateClinicNavKey, boolean> {
  const out = { ...DEFAULT_VISIBILITY };
  if (stored == null || typeof stored !== "object" || Array.isArray(stored)) return out;
  const o = stored as Record<string, unknown>;
  for (const item of PRIVATE_CLINIC_NAV_ITEMS) {
    const v = o[item.key];
    if (typeof v === "boolean") out[item.key] = v;
  }
  return out;
}

export function getVisiblePrivateClinicNavItems(
  stored: unknown,
): readonly (typeof PRIVATE_CLINIC_NAV_ITEMS)[number][] {
  const vis = mergePrivateClinicNavVisibility(stored);
  const filtered = PRIVATE_CLINIC_NAV_ITEMS.filter((i) => vis[i.key]);
  return filtered.length > 0 ? filtered : [...PRIVATE_CLINIC_NAV_ITEMS];
}
