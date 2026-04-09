import {
  InsurancePolicyType as InsurancePolicyTypeEnum,
  type InsurancePolicyType,
} from "@/generated/prisma/enums";

const EN: Record<InsurancePolicyType, string> = {
  car: "Car",
  health: "Health",
  home: "Home / property",
  life: "Life",
  other: "Other",
};

const HE: Record<InsurancePolicyType, string> = {
  car: "רכב",
  health: "בריאות",
  home: "דירה / נכס",
  life: "חיים",
  other: "אחר",
};

export function getInsurancePolicyTypeLabel(
  type: InsurancePolicyType,
  language: "en" | "he",
): string {
  return language === "he" ? HE[type] : EN[type];
}

export const INSURANCE_POLICY_TYPE_VALUES: InsurancePolicyType[] = Object.values(
  InsurancePolicyTypeEnum,
) as InsurancePolicyType[];

export function parseInsurancePolicyType(raw: string | null | undefined): InsurancePolicyType | null {
  const v = raw?.trim();
  if (!v) return null;
  return INSURANCE_POLICY_TYPE_VALUES.includes(v as InsurancePolicyType)
    ? (v as InsurancePolicyType)
    : null;
}
