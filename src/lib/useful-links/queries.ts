import { prisma } from "@/lib/auth";
import type { SectionId } from "@/lib/dashboard-sections";

export type UsefulLinkRow = Awaited<ReturnType<typeof prisma.useful_links.findMany>>[number];

const orderBy = [{ sort_order: "asc" as const }, { created_at: "asc" as const }];

export async function fetchUsefulLinksForSection(params: {
  sectionId: SectionId;
  householdId: string;
  userId: string;
}): Promise<{
  system: UsefulLinkRow[];
  household: UsefulLinkRow[];
  user: UsefulLinkRow[];
}> {
  const { sectionId, householdId, userId } = params;
  const [system, household, user] = await Promise.all([
    prisma.useful_links.findMany({
      where: {
        scope: "system",
        section_id: sectionId,
        is_active: true,
      },
      orderBy,
    }),
    prisma.useful_links.findMany({
      where: {
        scope: "household",
        household_id: householdId,
        section_id: sectionId,
        is_active: true,
      },
      orderBy,
    }),
    prisma.useful_links.findMany({
      where: {
        scope: "user",
        household_id: householdId,
        user_id: userId,
        section_id: sectionId,
        is_active: true,
      },
      orderBy,
    }),
  ]);
  return { system, household, user };
}
