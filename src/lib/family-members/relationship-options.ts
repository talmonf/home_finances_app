export const FAMILY_RELATIONSHIP_OPTIONS = [
  { value: "Son", labelEn: "Son", labelHe: "בן" },
  { value: "Daughter", labelEn: "Daughter", labelHe: "בת" },
  { value: "Grandson", labelEn: "Grandson", labelHe: "נכד" },
  { value: "Granddaughter", labelEn: "Granddaughter", labelHe: "נכדה" },
  { value: "Wife", labelEn: "Wife", labelHe: "אשה" },
  { value: "Husband", labelEn: "Husband", labelHe: "בעל" },
  { value: "Partner", labelEn: "Partner", labelHe: "בן/בת זוג" },
  { value: "Father", labelEn: "Father", labelHe: "אב" },
  { value: "Mother", labelEn: "Mother", labelHe: "אם" },
  { value: "Brother", labelEn: "Brother", labelHe: "אח" },
  { value: "Sister", labelEn: "Sister", labelHe: "אחות" },
  { value: "Son-in-law", labelEn: "Son-in-law", labelHe: "חתן" },
  { value: "Daughter-in-law", labelEn: "Daughter-in-law", labelHe: "כלה" },
  { value: "Other", labelEn: "Other", labelHe: "אחר" },
] as const;

export function relationshipLabel(value: string | null | undefined, isHebrew: boolean): string {
  if (!value) return "—";
  const opt = FAMILY_RELATIONSHIP_OPTIONS.find((o) => o.value === value);
  if (!opt) return value;
  return isHebrew ? opt.labelHe : opt.labelEn;
}
