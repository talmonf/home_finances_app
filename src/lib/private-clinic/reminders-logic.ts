import {
  PRIVATE_CLINIC_REMINDER_HORIZON_DAYS,
  isClinicInsurancePolicyType,
} from "@/lib/private-clinic/constants";
import type { InsurancePolicyType } from "@/generated/prisma/enums";

export { PRIVATE_CLINIC_REMINDER_HORIZON_DAYS };

export function dateOnlyLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfTodayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function addDays(base: Date, n: number): Date {
  const x = new Date(base);
  x.setDate(x.getDate() + n);
  return dateOnlyLocal(x);
}

function getDaysInMonth(year: number, monthZeroBased: number) {
  return new Date(year, monthZeroBased + 1, 0).getDate();
}

/** Next billing/renewal date strictly after `baseDate` (date-only). */
export function nextMonthlyRenewal(dayOfMonth: number, baseDate: Date): Date {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const thisMonthDay = Math.min(dayOfMonth, getDaysInMonth(year, month));
  const candidateThisMonth = new Date(year, month, thisMonthDay);
  if (candidateThisMonth > baseDate) {
    return dateOnlyLocal(candidateThisMonth);
  }
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  const nextMonthDay = Math.min(dayOfMonth, getDaysInMonth(nextYear, nextMonth));
  return dateOnlyLocal(new Date(nextYear, nextMonth, nextMonthDay));
}

export function reminderDateWithinWindow(
  reminderDate: Date,
  today: Date,
  horizonDays: number = PRIVATE_CLINIC_REMINDER_HORIZON_DAYS,
): boolean {
  return dateOnlyLocal(reminderDate) <= addDays(today, horizonDays);
}

export type SubscriptionReminderFields = {
  id: string;
  name: string;
  billing_interval: "monthly" | "annual";
  monthly_day_of_month: number | null;
  renewal_date: Date | null;
  is_active: boolean;
  cancelled_at: Date | null;
  job_id: string | null;
};

export function subscriptionReminderDate(sub: SubscriptionReminderFields, today: Date): Date | null {
  if (!sub.job_id || !sub.is_active || sub.cancelled_at) return null;
  if (sub.billing_interval === "monthly" && sub.monthly_day_of_month != null) {
    return nextMonthlyRenewal(sub.monthly_day_of_month, today);
  }
  if (sub.billing_interval === "annual" && sub.renewal_date) {
    return dateOnlyLocal(sub.renewal_date);
  }
  return null;
}

export type InsuranceReminderFields = {
  id: string;
  policy_type: InsurancePolicyType;
  is_active: boolean;
  expiration_date: Date;
  provider_name: string;
  policy_name: string;
};

export function clinicInsuranceReminderEligible(p: InsuranceReminderFields): boolean {
  return p.is_active && isClinicInsurancePolicyType(p.policy_type);
}

export type ClientReminderFields = {
  id: string;
  is_active: boolean;
  end_date: Date | null;
  first_name: string;
  last_name: string | null;
};

export function clientEndReminderEligible(c: ClientReminderFields): boolean {
  return c.is_active && c.end_date != null;
}

export type RentalReminderFields = {
  id: string;
  is_clinic_lease: boolean;
  end_date: Date | null;
  property_id: string;
  property?: { name: string };
};

export function clinicLeaseReminderEligible(r: RentalReminderFields): boolean {
  return r.is_clinic_lease && r.end_date != null;
}

export type ManualReminderFields = {
  id: string;
  reminder_date: Date;
  category: string;
  description: string | null;
};

export type ReminderRowKind = "manual" | "subscription" | "client" | "insurance" | "rental";

export type UnifiedReminderRow = {
  kind: ReminderRowKind;
  key: string;
  reminderDate: Date;
  summary: string;
  sourceId: string;
  href: string;
  editHref?: string;
};

export function countUpcomingReminders(params: {
  today: Date;
  horizonDays?: number;
  manual: ManualReminderFields[];
  subscriptions: SubscriptionReminderFields[];
  clients: ClientReminderFields[];
  clinicInsurance: InsuranceReminderFields[];
  clinicRentals: RentalReminderFields[];
}): number {
  const h = params.horizonDays ?? PRIVATE_CLINIC_REMINDER_HORIZON_DAYS;
  const { today } = params;
  let n = 0;
  for (const m of params.manual) {
    if (reminderDateWithinWindow(m.reminder_date, today, h)) n += 1;
  }
  for (const s of params.subscriptions) {
    const d = subscriptionReminderDate(s, today);
    if (d && reminderDateWithinWindow(d, today, h)) n += 1;
  }
  for (const c of params.clients) {
    if (!clientEndReminderEligible(c) || !c.end_date) continue;
    if (reminderDateWithinWindow(c.end_date, today, h)) n += 1;
  }
  for (const p of params.clinicInsurance) {
    if (!clinicInsuranceReminderEligible(p)) continue;
    if (reminderDateWithinWindow(p.expiration_date, today, h)) n += 1;
  }
  for (const r of params.clinicRentals) {
    if (!clinicLeaseReminderEligible(r) || !r.end_date) continue;
    if (reminderDateWithinWindow(r.end_date, today, h)) n += 1;
  }
  return n;
}

export function buildUnifiedReminderRows(params: {
  today: Date;
  horizonDays?: number;
  manual: ManualReminderFields[];
  subscriptions: SubscriptionReminderFields[];
  clients: ClientReminderFields[];
  clinicInsurance: InsuranceReminderFields[];
  clinicRentals: RentalReminderFields[];
}): UnifiedReminderRow[] {
  const h = params.horizonDays ?? PRIVATE_CLINIC_REMINDER_HORIZON_DAYS;
  const { today } = params;
  const rows: UnifiedReminderRow[] = [];

  for (const m of params.manual) {
    if (!reminderDateWithinWindow(m.reminder_date, today, h)) continue;
    rows.push({
      kind: "manual",
      key: `manual-${m.id}`,
      reminderDate: m.reminder_date,
      summary: [m.category?.trim(), m.description?.trim()].filter(Boolean).join(" — ") || "—",
      sourceId: m.id,
      href: "/dashboard/private-clinic/reminders",
      editHref: `/dashboard/private-clinic/reminders?edit=${encodeURIComponent(m.id)}`,
    });
  }

  for (const s of params.subscriptions) {
    const d = subscriptionReminderDate(s, today);
    if (!d || !reminderDateWithinWindow(d, today, h)) continue;
    rows.push({
      kind: "subscription",
      key: `sub-${s.id}`,
      reminderDate: d,
      summary: s.name,
      sourceId: s.id,
      href: `/dashboard/subscriptions/${s.id}`,
      editHref: `/dashboard/subscriptions/${s.id}`,
    });
  }

  for (const c of params.clients) {
    if (!clientEndReminderEligible(c) || !c.end_date) continue;
    if (!reminderDateWithinWindow(c.end_date, today, h)) continue;
    const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
    rows.push({
      kind: "client",
      key: `client-${c.id}`,
      reminderDate: c.end_date,
      summary: name,
      sourceId: c.id,
      href: "/dashboard/private-clinic/clients",
      editHref: "/dashboard/private-clinic/clients",
    });
  }

  for (const p of params.clinicInsurance) {
    if (!clinicInsuranceReminderEligible(p)) continue;
    if (!reminderDateWithinWindow(p.expiration_date, today, h)) continue;
    rows.push({
      kind: "insurance",
      key: `ins-${p.id}`,
      reminderDate: p.expiration_date,
      summary: `${p.provider_name} — ${p.policy_name}`,
      sourceId: p.id,
      href: "/dashboard/private-clinic/clinic-insurance",
      editHref: "/dashboard/private-clinic/clinic-insurance",
    });
  }

  for (const r of params.clinicRentals) {
    if (!clinicLeaseReminderEligible(r) || !r.end_date) continue;
    if (!reminderDateWithinWindow(r.end_date, today, h)) continue;
    const propName = r.property?.name ?? "Property";
    rows.push({
      kind: "rental",
      key: `rent-${r.id}`,
      reminderDate: r.end_date,
      summary: `${propName} — lease end`,
      sourceId: r.id,
      href: `/dashboard/properties/${r.property_id}/rentals`,
      editHref: `/dashboard/properties/${r.property_id}/rentals`,
    });
  }

  rows.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime());
  return rows;
}
