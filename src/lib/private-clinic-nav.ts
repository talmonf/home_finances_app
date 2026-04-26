export const PRIVATE_CLINIC_NAV_ITEMS = [
  { key: "overview", href: "/dashboard/private-clinic", label: "Overview", placement: "primary" },
  { key: "clients", href: "/dashboard/private-clinic/clients", label: "Clients", placement: "primary" },
  { key: "families", href: "/dashboard/private-clinic/families", label: "Families", placement: "primary" },
  {
    key: "appointments",
    href: "/dashboard/private-clinic/appointments",
    label: "Appointments",
    placement: "primary",
  },
  {
    key: "upcomingVisits",
    href: "/dashboard/private-clinic/upcoming-visits",
    label: "Upcoming visits",
    placement: "primary",
  },
  { key: "treatments", href: "/dashboard/private-clinic/treatments", label: "Treatments", placement: "primary" },
  { key: "receipts", href: "/dashboard/private-clinic/receipts", label: "Receipts", placement: "primary" },
  { key: "expenses", href: "/dashboard/private-clinic/expenses", label: "Expenses", placement: "primary" },
  {
    key: "consultations",
    href: "/dashboard/private-clinic/consultations",
    label: "Consultations",
    placement: "primary",
  },
  { key: "travel", href: "/dashboard/private-clinic/travel", label: "Travel", placement: "primary" },
  { key: "petrol", href: "/dashboard/private-clinic/petrol", label: "Petrol", placement: "primary" },
  { key: "reminders", href: "/dashboard/private-clinic/reminders", label: "Reminders", placement: "primary" },
  { key: "jobs", href: "/dashboard/private-clinic/jobs", label: "Jobs", placement: "more" },
  { key: "programs", href: "/dashboard/private-clinic/programs", label: "Programs", placement: "more" },
  {
    key: "clinicInsurance",
    href: "/dashboard/private-clinic/clinic-insurance",
    label: "Clinic insurance",
    placement: "more",
  },
  {
    key: "workSubscriptions",
    href: "/dashboard/private-clinic/work-subscriptions",
    label: "Work subscriptions",
    placement: "more",
  },
  { key: "reports", href: "/dashboard/private-clinic/reports", label: "Reports", placement: "more" },
  { key: "settings", href: "/dashboard/private-clinic/settings", label: "Settings", placement: "more" },
  { key: "importExport", href: "/dashboard/private-clinic/import-export", label: "Import / Export", placement: "more" },
] as const;

export type PrivateClinicNavKey = (typeof PRIVATE_CLINIC_NAV_ITEMS)[number]["key"];

const DEFAULT_VISIBILITY: Record<PrivateClinicNavKey, boolean> = Object.fromEntries(
  PRIVATE_CLINIC_NAV_ITEMS.map((i) => [i.key, i.key === "families" ? false : true]),
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
