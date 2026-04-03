/** IDs used for household_section_statuses and household_enabled_sections (setup group). */
export const SETUP_SECTION_IDS = [
  "familyMembers",
  "properties",
  "bankAccounts",
  "digitalPaymentMethods",
  "creditCards",
  "cars",
  "jobs",
] as const;

export type SetupSectionId = (typeof SETUP_SECTION_IDS)[number];

export function isSetupSectionId(id: string): id is SetupSectionId {
  return (SETUP_SECTION_IDS as readonly string[]).includes(id);
}
