import type { SectionId } from "@/lib/dashboard-sections";

/**
 * Maps current URL path to a dashboard section for useful links.
 * Longer prefixes are checked first where order matters.
 */
const RULES: { prefix: string; sectionId: SectionId }[] = [
  { prefix: "/dashboard/private-clinic", sectionId: "privateClinic" },
  { prefix: "/dashboard/studies-and-classes", sectionId: "studiesAndClasses" },
  { prefix: "/dashboard/digital-payment-methods", sectionId: "digitalPaymentMethods" },
  { prefix: "/dashboard/petrol-fillups", sectionId: "petrolFillups" },
  { prefix: "/dashboard/significant-purchases", sectionId: "significantPurchases" },
  { prefix: "/dashboard/medical-appointments", sectionId: "medicalAppointments" },
  { prefix: "/dashboard/insurance-policies", sectionId: "insurancePolicies" },
  { prefix: "/dashboard/savings-policies", sectionId: "savingsPolicies" },
  { prefix: "/dashboard/upcoming-renewals", sectionId: "upcomingRenewals" },
  { prefix: "/dashboard/donation-commitments", sectionId: "donations" },
  { prefix: "/dashboard/family-members", sectionId: "familyMembers" },
  { prefix: "/dashboard/bank-accounts", sectionId: "bankAccounts" },
  { prefix: "/dashboard/credit-cards", sectionId: "creditCards" },
  { prefix: "/dashboard/subscriptions", sectionId: "subscriptions" },
  { prefix: "/dashboard/properties", sectionId: "properties" },
  { prefix: "/dashboard/import", sectionId: "importStatements" },
  { prefix: "/dashboard/donations", sectionId: "donations" },
  { prefix: "/dashboard/cars", sectionId: "cars" },
  { prefix: "/dashboard/jobs", sectionId: "jobs" },
  { prefix: "/dashboard/trips", sectionId: "trips" },
  { prefix: "/dashboard/tasks", sectionId: "tasks" },
  { prefix: "/dashboard/loans", sectionId: "loans" },
  { prefix: "/dashboard/reports", sectionId: "reports" },
  { prefix: "/dashboard/identities", sectionId: "familyMembers" },
];

export function sectionIdFromDashboardPathname(pathname: string): SectionId | null {
  if (!pathname.startsWith("/dashboard")) return null;
  for (const { prefix, sectionId } of RULES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return sectionId;
    }
  }
  return null;
}
