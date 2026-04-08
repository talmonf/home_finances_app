import { prisma } from "@/lib/auth";
import { getDashboardSections } from "@/lib/dashboard-sections";
import type { UiLanguage } from "@/lib/ui-language";

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

export async function getEffectiveEnabledSections(params: {
  householdId: string;
  userId?: string | null;
}): Promise<EnabledSection[]> {
  const { householdId, userId } = params;
  const [householdRows, userRows] = await Promise.all([
    prisma.household_enabled_sections.findMany({
      where: { household_id: householdId },
      select: { section_id: true, enabled: true },
    }),
    userId
      ? prisma.user_enabled_sections.findMany({
          where: { household_id: householdId, user_id: userId },
          select: { section_id: true, enabled: true },
        })
      : Promise.resolve([] as { section_id: string; enabled: boolean }[]),
  ]);

  const merged = new Map<string, boolean>();
  for (const row of householdRows) merged.set(row.section_id, row.enabled);
  for (const row of userRows) merged.set(row.section_id, row.enabled);

  return Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sectionId, enabled]) => ({ sectionId, enabled }));
}

export async function getUserEnabledSections(params: {
  householdId: string;
  userId: string;
}): Promise<EnabledSection[]> {
  const rows = await prisma.user_enabled_sections.findMany({
    where: { household_id: params.householdId, user_id: params.userId },
    select: { section_id: true, enabled: true },
    orderBy: { section_id: "asc" },
  });
  return rows.map((r) => ({ sectionId: r.section_id, enabled: r.enabled }));
}

export async function upsertUserEnabledSections(params: {
  householdId: string;
  userId: string;
  enabledBySectionId: Record<string, boolean>;
}) {
  const { householdId, userId, enabledBySectionId } = params;
  const entries = Object.entries(enabledBySectionId);
  if (entries.length === 0) return;

  await Promise.all(
    entries.map(([sectionId, enabled]) =>
      prisma.user_enabled_sections.upsert({
        where: {
          user_id_section_id: {
            user_id: userId,
            section_id: sectionId,
          },
        },
        update: { enabled, household_id: householdId },
        create: {
          id: crypto.randomUUID(),
          household_id: householdId,
          user_id: userId,
          section_id: sectionId,
          enabled,
        },
      }),
    ),
  );
}

/** True when the user’s effective dashboard has only the Private clinic section (same rule as home redirect). */
export async function householdUserOnlyPrivateClinicSection(
  householdId: string,
  userId: string,
  uiLanguage: UiLanguage,
): Promise<boolean> {
  const enabledSections = await getEffectiveEnabledSections({ householdId, userId });
  const enabledBySectionId = new Map(
    enabledSections.map((s) => [s.sectionId, s.enabled] as const),
  );
  const visibleSections = getDashboardSections(uiLanguage).filter(
    (s) => enabledBySectionId.get(s.id) ?? true,
  );
  return visibleSections.length === 1 && visibleSections[0].id === "privateClinic";
}
