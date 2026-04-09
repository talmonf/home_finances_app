import type { SectionId } from "@/lib/dashboard-sections";
import { getEffectiveEnabledSections } from "@/lib/household-sections";

export async function isDashboardSectionVisibleForMember(params: {
  sectionId: SectionId;
  householdId: string;
  userId: string;
}): Promise<boolean> {
  const { sectionId, householdId, userId } = params;
  const enabledRows = await getEffectiveEnabledSections({ householdId, userId });
  const map = new Map(enabledRows.map((r) => [r.sectionId, r.enabled] as const));
  return map.get(sectionId) ?? true;
}
