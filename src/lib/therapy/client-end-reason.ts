export const THERAPY_CLIENT_END_REASON_PROGRAM_NAMES = [
  "הוספיס בית",
  "איזון סימפטומים",
  "כלנית",
] as const;

export const THERAPY_CLIENT_END_REASONS = [
  "death_at_home",
  "death_in_hospital",
  "transfer_to_inpatient_hospice",
  "other",
] as const;

export type TherapyClientEndReason = (typeof THERAPY_CLIENT_END_REASONS)[number];

const END_REASON_PROGRAM_NAME_SET = new Set<string>(THERAPY_CLIENT_END_REASON_PROGRAM_NAMES);

export function programNameShowsEndReason(programName: string | null | undefined): boolean {
  if (!programName) return false;
  return END_REASON_PROGRAM_NAME_SET.has(programName.trim());
}

export function parseTherapyClientEndReason(raw: string | null | undefined): TherapyClientEndReason | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  return THERAPY_CLIENT_END_REASONS.includes(value as TherapyClientEndReason)
    ? (value as TherapyClientEndReason)
    : null;
}

export function therapyClientEndReasonLabel(
  reason: TherapyClientEndReason,
  uiLanguage: "en" | "he",
): string {
  const labels: Record<TherapyClientEndReason, { en: string; he: string }> = {
    death_at_home: { en: "Death at home", he: "פטירה בבית" },
    death_in_hospital: { en: "Death in hospital", he: "פטירה בבית חולים" },
    transfer_to_inpatient_hospice: {
      en: "Transfer to inpatient hospice",
      he: "מעבר להוספיס אשפוזי",
    },
    other: { en: "Other", he: "אחר" },
  };
  return uiLanguage === "he" ? labels[reason].he : labels[reason].en;
}
