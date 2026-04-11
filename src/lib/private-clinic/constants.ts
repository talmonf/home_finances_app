import type { InsurancePolicyType } from "@/generated/prisma/enums";

/** Days ahead (and overdue items) included in Private Clinic reminders and nav badge. */
export const PRIVATE_CLINIC_REMINDER_HORIZON_DAYS = 60;

export const CLINIC_INSURANCE_POLICY_TYPES: InsurancePolicyType[] = [
  "professional_liability",
  "clinic_premises",
];

export function isClinicInsurancePolicyType(t: InsurancePolicyType): boolean {
  return CLINIC_INSURANCE_POLICY_TYPES.includes(t);
}
