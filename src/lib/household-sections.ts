import { prisma } from "@/lib/auth";

export type EnabledSection = {
  sectionId: string;
  enabled: boolean;
};

export async function getHouseholdEnabledSections(
  householdId: string,
): Promise<EnabledSection[]> {
  const rows = await prisma.household_enabled_sections.findMany({
    where: { household_id: householdId },
    select: { section_id: true, enabled: true },
    orderBy: { section_id: "asc" },
  });

  return rows.map((r) => ({
    sectionId: r.section_id,
    enabled: r.enabled,
  }));
}

export async function upsertHouseholdEnabledSections(params: {
  householdId: string;
  enabledBySectionId: Record<string, boolean>;
}) {
  const { householdId, enabledBySectionId } = params;

  const entries = Object.entries(enabledBySectionId);
  if (entries.length === 0) return;

  await Promise.all(
    entries.map(([sectionId, enabled]) =>
      prisma.household_enabled_sections.upsert({
        where: {
          household_id_section_id: {
            household_id: householdId,
            section_id: sectionId,
          },
        },
        update: { enabled },
        create: {
          id: crypto.randomUUID(),
          household_id: householdId,
          section_id: sectionId,
          enabled,
        },
      }),
    ),
  );
}

