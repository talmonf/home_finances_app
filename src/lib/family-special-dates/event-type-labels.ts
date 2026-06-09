import {
  FamilySpecialDateEventType as FamilySpecialDateEventTypeEnum,
  type FamilySpecialDateEventType,
} from "@/generated/prisma/enums";

const EN: Record<FamilySpecialDateEventType, string> = {
  death: "Death",
  bar_mitzvah: "Bar mitzvah",
  bat_mitzvah: "Bat mitzvah",
  engagement: "Engagement",
  aliyah: "Aliyah",
  graduation: "Graduation",
  other: "Other",
};

const HE: Record<FamilySpecialDateEventType, string> = {
  death: "פטירה",
  bar_mitzvah: "בר מצווה",
  bat_mitzvah: "בת מצווה",
  engagement: "אירוסין",
  aliyah: "עלייה",
  graduation: "סיום לימודים",
  other: "אחר",
};

export function getFamilySpecialDateEventTypeLabel(
  type: FamilySpecialDateEventType,
  language: "en" | "he",
): string {
  return language === "he" ? HE[type] : EN[type];
}

export const FAMILY_SPECIAL_DATE_EVENT_TYPE_VALUES: FamilySpecialDateEventType[] = Object.values(
  FamilySpecialDateEventTypeEnum,
) as FamilySpecialDateEventType[];

export function parseFamilySpecialDateEventType(
  raw: string | null | undefined,
): FamilySpecialDateEventType | null {
  const v = raw?.trim();
  if (!v) return null;
  return FAMILY_SPECIAL_DATE_EVENT_TYPE_VALUES.includes(v as FamilySpecialDateEventType)
    ? (v as FamilySpecialDateEventType)
    : null;
}

export function resolveSpecialDateEventTypeLabel(params: {
  event_type: FamilySpecialDateEventType;
  event_type_other: string | null;
  language: "en" | "he";
}): string {
  const { event_type, event_type_other, language } = params;
  if (event_type === "other" && event_type_other?.trim()) {
    return event_type_other.trim();
  }
  return getFamilySpecialDateEventTypeLabel(event_type, language);
}

export function resolveSpecialDateDisplayName(params: {
  display_name: string | null;
  family_member: { full_name: string } | null;
}): string {
  if (params.family_member) {
    return params.family_member.full_name;
  }
  return params.display_name?.trim() ?? "";
}
