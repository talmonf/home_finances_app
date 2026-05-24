import { prisma } from "@/lib/auth";
import { getInsurancePolicyTypeLabel } from "@/lib/insurance-policy-type-labels";

export type RenewalRow = {
  id: string;
  category: string;
  itemName: string;
  owner: string;
  ownerId: string | null;
  renewalDate: Date;
  renewalType: string;
  href: string;
};

const PURCHASE_CATEGORY_LABELS: Record<string, string> = {
  electronics: "Electronics",
  appliances: "Appliances",
  tools: "Tools",
  other: "Other",
};

export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function dateOnlyLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

export function nextMonthlyRenewal(dayOfMonth: number, baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const thisMonthDay = Math.min(dayOfMonth, getDaysInMonth(year, month));
  const candidateThisMonth = new Date(year, month, thisMonthDay);
  if (candidateThisMonth > baseDate) {
    return candidateThisMonth;
  }
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const nextMonthDay = Math.min(dayOfMonth, getDaysInMonth(nextYear, nextMonth));
  return new Date(nextYear, nextMonth, nextMonthDay);
}

/** Add whole calendar days to a local date-only baseline (no time-of-day drift). */
export function addDaysLocal(base: Date, days: number): Date {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

/** Categories whose past-due rows appear on the dashboard even when `includePastDue` is false. */
export const PAST_DUE_ALLOWED_CATEGORIES = new Set<string>(["Task", "Donation"]);

/** Filter rows to renewal dates in [today, today + daysAhead] (local calendar days). */
export function filterRenewalRowsByDaysAhead(
  rows: RenewalRow[],
  today: Date,
  daysAhead: number,
  options?: { includePastDue?: boolean },
): RenewalRow[] {
  const end = addDaysLocal(today, daysAhead);
  const includePastDue = options?.includePastDue === true;
  return rows.filter((r) => {
    const rd = dateOnlyLocal(r.renewalDate);
    if (rd > end) return false;
    if (includePastDue) return true;
    if (rd >= today) return true;
    return PAST_DUE_ALLOWED_CATEGORIES.has(r.category);
  });
}

/** Earliest date for DB queries when loading overdue renewal rows (with `includePastDue`). */
const RENEWAL_LOOKBACK_START = new Date(1900, 0, 1);

export const RENEWAL_CATEGORY_ORDER = [
  "Subscription",
  "Identity",
  "Credit card",
  "Insurance",
  "Savings policy",
  "Car license",
  "Car service",
  "Rental",
  "Utility",
  "Task",
  "Donation",
  "Loan",
  "Warranty",
] as const;

export type ComputeUpcomingRenewalsParams = {
  householdId: string;
  /** Defaults to start of today in local time. */
  today?: Date;
  /** When set, only rows with renewal date in [today, today + daysAhead] (inclusive). */
  daysAhead?: number;
  /** When true with `daysAhead`, also include renewal dates before today (overdue / past due). */
  includePastDue?: boolean;
  language: "en" | "he";
};

/**
 * Loads and merges the same renewal/deadline rows as the dashboard upcoming-renewals page.
 */
export async function computeUpcomingRenewals(
  params: ComputeUpcomingRenewalsParams,
): Promise<RenewalRow[]> {
  const { householdId, daysAhead, includePastDue, language } = params;
  const today = params.today ?? startOfToday();
  const isHebrew = language === "he";
  const windowStart = includePastDue === true ? RENEWAL_LOOKBACK_START : today;

  const [
    subscriptions,
    identities,
    creditCards,
    insurancePolicies,
    rentals,
    utilities,
    tasks,
    donationRenewals,
    significantPurchases,
    carLicenses,
    carServicesNext,
    loansForRenewals,
    savingsPoliciesForRenewals,
  ] = await Promise.all([
    prisma.subscriptions.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        OR: [
          { billing_interval: "monthly", monthly_day_of_month: { not: null } },
          { billing_interval: "annual", renewal_date: { not: null } },
        ],
      },
      include: {
        credit_card: { include: { family_member: true } },
        digital_payment_method: { include: { family_member: true } },
        family_member: true,
      },
    }),
    prisma.identities.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        expiry_date: { gte: windowStart },
      },
      include: { family_member: true },
    }),
    prisma.credit_cards.findMany({
      where: {
        household_id: householdId,
        cancelled_at: null,
        OR: [
          { expiry_date: { not: null, gte: windowStart } },
          { no_charge_policy_valid_until: { not: null, gte: windowStart } },
        ],
      },
      include: { family_member: true },
    }),
    prisma.insurance_policies.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        expiration_date: { gte: windowStart },
      },
      include: { car: true, family_member: true },
    }),
    prisma.rentals.findMany({
      where: {
        household_id: householdId,
        end_date: { not: null, gte: windowStart },
      },
      include: { property: true },
    }),
    prisma.property_utilities.findMany({
      where: {
        household_id: householdId,
        renewal_date: { not: null, gte: windowStart },
      },
      include: { property: true },
    }),
    prisma.tasks.findMany({
      where: {
        household_id: householdId,
        due_date: { not: null },
        status: { not: "closed" },
      },
      include: { family_member: true, assigned_user: true },
    }),
    prisma.donations.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        renewal_date: { not: null },
      },
      include: { payee: true, family_member: true },
    }),
    prisma.significant_purchases.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        warranty_expiry_date: { not: null, gte: windowStart },
      },
      include: { family_member: true, credit_card: { include: { family_member: true } } },
    }),
    prisma.car_licenses.findMany({
      where: {
        household_id: householdId,
        expires_at: { gte: windowStart },
      },
      include: { car: true },
      orderBy: { expires_at: "asc" },
    }),
    prisma.car_services.findMany({
      where: {
        household_id: householdId,
        next_service_at: { not: null, gte: windowStart },
      },
      include: { car: true },
      orderBy: { next_service_at: "asc" },
    }),
    prisma.loans.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        OR: [
          { repayment_day_of_month: { not: null } },
          { maturity_date: { not: null, gte: windowStart } },
        ],
      },
    }),
    prisma.savings_policies.findMany({
      where: {
        household_id: householdId,
        is_active: true,
        OR: [
          { renewal_date: { not: null, gte: windowStart } },
          { maturity_date: { not: null, gte: windowStart } },
        ],
      },
      include: { owner: true },
    }),
  ]);

  const renewalsLang: "en" | "he" = language;

  const rows: RenewalRow[] = [
    ...subscriptions.map((s) => ({
      id: `sub-${s.id}`,
      category: "Subscription",
      itemName: s.name,
      owner:
        s.family_member?.full_name ??
        s.digital_payment_method?.family_member?.full_name ??
        s.credit_card?.family_member?.full_name ??
        "Household",
      ownerId:
        s.family_member?.id ??
        s.digital_payment_method?.family_member?.id ??
        s.credit_card?.family_member?.id ??
        null,
      renewalDate:
        s.billing_interval === "monthly" && s.monthly_day_of_month
          ? nextMonthlyRenewal(s.monthly_day_of_month, today)
          : (s.renewal_date as Date),
      renewalType: s.billing_interval === "monthly" ? "Monthly" : "Annual",
      href: `/dashboard/subscriptions/${encodeURIComponent(s.id)}`,
    })),
    ...identities.map((i) => ({
      id: `identity-${i.id}`,
      category: "Identity",
      itemName:
        (() => {
          const other = i.identity_type_other?.trim() || null;
          const typeLabel =
            i.identity_type === "other" ? "Other" : i.identity_type.replaceAll("_", " ");
          return other ? `${typeLabel} - ${other}` : typeLabel;
        })(),
      owner: i.family_member.full_name,
      ownerId: i.family_member.id,
      renewalDate: i.expiry_date,
      renewalType: "—",
      href: `/dashboard/identities/${i.id}`,
    })),
    ...creditCards
      .filter((c) => c.expiry_date)
      .map((c) => ({
        id: `card-${c.id}`,
        category: "Credit card",
        itemName: c.card_name,
        owner: c.family_member?.full_name ?? (isHebrew ? "משק הבית" : "Household"),
        ownerId: c.family_member?.id ?? null,
        renewalDate: c.expiry_date as Date,
        renewalType: "—",
        href: "/dashboard/credit-cards",
      })),
    ...creditCards
      .filter((c) => c.no_charge_policy_valid_until)
      .map((c) => ({
        id: `card-no-charge-${c.id}`,
        category: "Credit card",
        itemName: c.card_name,
        owner: c.family_member?.full_name ?? (isHebrew ? "משק הבית" : "Household"),
        ownerId: c.family_member?.id ?? null,
        renewalDate: c.no_charge_policy_valid_until as Date,
        renewalType: isHebrew ? "תוקף ללא חיוב" : "No-charge policy",
        href: "/dashboard/credit-cards",
      })),
    ...insurancePolicies.map((p) => {
      const typeLabel = getInsurancePolicyTypeLabel(p.policy_type, renewalsLang);
      const carPart =
        p.car != null
          ? `${p.car.maker} ${p.car.model}${p.car.plate_number ? ` · ${p.car.plate_number}` : ""}`
          : null;
      const itemName = `${typeLabel}: ${p.provider_name} — ${p.policy_name}${
        carPart ? ` (${carPart})` : p.policy_number ? ` (#${p.policy_number})` : ""
      }`;
      const owner =
        p.family_member?.full_name ?? (carPart ?? (isHebrew ? "משק הבית" : "Household"));
      return {
        id: `insurance-${p.id}`,
        category: "Insurance",
        itemName,
        owner,
        ownerId: p.family_member_id,
        renewalDate: p.expiration_date,
        renewalType: "—",
        href: "/dashboard/insurance-policies",
      };
    }),
    ...savingsPoliciesForRenewals.flatMap((s) => {
      const parts: RenewalRow[] = [];
      const baseName = `${s.provider_name} — ${s.policy_name}`;
      const owner = s.owner?.full_name ?? (isHebrew ? "משק הבית" : "Household");
      const ownerId = s.owner_family_member_id;
      if (s.renewal_date && dateOnlyLocal(s.renewal_date as Date) >= windowStart) {
        parts.push({
          id: `savings-renewal-${s.id}`,
          category: "Savings policy",
          itemName: baseName,
          owner,
          ownerId,
          renewalDate: s.renewal_date as Date,
          renewalType: isHebrew ? "חידוש" : "Renewal",
          href: "/dashboard/savings-policies",
        });
      }
      if (s.maturity_date && dateOnlyLocal(s.maturity_date as Date) >= windowStart) {
        parts.push({
          id: `savings-maturity-${s.id}`,
          category: "Savings policy",
          itemName: `${baseName} (${isHebrew ? "פרעון" : "maturity"})`,
          owner,
          ownerId,
          renewalDate: s.maturity_date as Date,
          renewalType: isHebrew ? "פרעון" : "Maturity",
          href: "/dashboard/savings-policies",
        });
      }
      return parts;
    }),
    ...carLicenses.map((l) => ({
      id: `car-license-${l.id}`,
      category: "Car license",
      itemName: `${l.car.maker} ${l.car.model}${l.car.plate_number ? ` · ${l.car.plate_number}` : ""}`,
      owner: "Vehicle",
      ownerId: null,
      renewalDate: l.expires_at,
      renewalType: "Expiry",
      href: `/dashboard/cars/${l.car_id}`,
    })),
    ...carServicesNext.map((s) => ({
      id: `car-service-${s.id}`,
      category: "Car service",
      itemName: `${s.provider_name} — ${s.car.maker} ${s.car.model}${s.car.plate_number ? ` · ${s.car.plate_number}` : ""}`,
      owner: "Vehicle",
      ownerId: null,
      renewalDate: s.next_service_at as Date,
      renewalType: "Next service",
      href: `/dashboard/cars/${s.car_id}`,
    })),
    ...rentals
      .filter((r) => r.end_date)
      .map((r) => ({
        id: `rental-${r.id}`,
        category: "Rental",
        itemName: `${r.property.name} rental`,
        owner: r.property.name,
        ownerId: null,
        renewalDate: r.end_date as Date,
        renewalType: "End Date",
        href: `/dashboard/properties/${r.property_id}`,
      })),
    ...utilities
      .filter((u) => u.renewal_date)
      .map((u) => ({
        id: `utility-${u.id}`,
        category: "Utility",
        itemName: `${u.provider_name} (${u.utility_type})`,
        owner: u.property.name,
        ownerId: null,
        renewalDate: u.renewal_date as Date,
        renewalType: "—",
        href: `/dashboard/properties/${u.property_id}/utilities/${u.id}/edit`,
      })),
    ...tasks
      .filter((t) => t.due_date)
      .map((t) => ({
        id: `task-${t.id}`,
        category: "Task",
        itemName: t.subject,
        owner: t.family_member?.full_name ?? t.assigned_user?.full_name ?? "Household",
        ownerId: t.family_member?.id ?? null,
        renewalDate: t.due_date as Date,
        renewalType: "Due Date",
        href: `/dashboard/tasks/${t.id}/edit`,
      })),
    ...donationRenewals.map((d) => ({
      id: `donation-${d.id}`,
      category: "Donation",
      itemName: `${d.organization_name} (${d.category})`,
      owner: d.family_member ? d.family_member.full_name : "Household",
      ownerId: d.family_member?.id ?? null,
      renewalDate: d.renewal_date as Date,
      renewalType: "—",
      href: `/dashboard/donations/${d.id}`,
    })),
    ...significantPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      category: "Warranty",
      itemName: `${PURCHASE_CATEGORY_LABELS[p.purchase_category] ?? p.purchase_category} — ${p.item_name}`,
      owner: p.family_member?.full_name ?? p.credit_card?.family_member?.full_name ?? "Household",
      ownerId: p.family_member?.id ?? p.credit_card?.family_member?.id ?? null,
      renewalDate: p.warranty_expiry_date as Date,
      renewalType: "—",
      href: "/dashboard/significant-purchases",
    })),
    ...loansForRenewals.flatMap((loan) => {
      const parts: RenewalRow[] = [];
      if (loan.repayment_day_of_month != null) {
        parts.push({
          id: `loan-monthly-${loan.id}`,
          category: "Loan",
          itemName: `${loan.institution_name}${loan.loan_number ? ` · #${loan.loan_number}` : ""}`,
          owner: "Household",
          ownerId: null,
          renewalDate: nextMonthlyRenewal(loan.repayment_day_of_month, today),
          renewalType: "Monthly",
          href: `/dashboard/loans/${encodeURIComponent(loan.id)}`,
        });
      }
      if (loan.maturity_date && dateOnlyLocal(loan.maturity_date as Date) >= windowStart) {
        parts.push({
          id: `loan-payoff-${loan.id}`,
          category: "Loan",
          itemName: `${loan.institution_name} (payoff)${loan.loan_number ? ` · #${loan.loan_number}` : ""}`,
          owner: "Household",
          ownerId: null,
          renewalDate: dateOnlyLocal(loan.maturity_date as Date),
          renewalType: "Payoff",
          href: `/dashboard/loans/${encodeURIComponent(loan.id)}`,
        });
      }
      return parts;
    }),
  ].sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime());

  if (daysAhead !== undefined) {
    return filterRenewalRowsByDaysAhead(rows, today, daysAhead, { includePastDue });
  }
  return rows;
}

export async function fetchFamilyMembersForHousehold(householdId: string) {
  return prisma.family_members.findMany({
    where: { household_id: householdId, is_active: true },
    select: { id: true, full_name: true },
    orderBy: { full_name: "asc" },
  });
}
