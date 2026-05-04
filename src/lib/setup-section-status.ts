import { prisma } from "@/lib/auth";
import type { SetupSectionId } from "@/lib/setup-section-ids";

export async function getSetupSectionIsDone(
  householdId: string,
  sectionId: SetupSectionId,
): Promise<boolean> {
  const row = await prisma.household_section_statuses.findUnique({
    where: {
      household_id_section_id: {
        household_id: householdId,
        section_id: sectionId,
      },
    },
    select: { is_done: true },
  });
  return row?.is_done === true;
}
