import { prisma } from "@/lib/auth";

/**
 * Reads `family_member_ids` from FormData (checkbox values) and returns only IDs
 * that belong to the household (active members). Unknown IDs are dropped.
 */
export async function parseFamilyMemberIdsForHousehold(
  formData: FormData,
  householdId: string
): Promise<string[]> {
  const raw = formData
    .getAll("family_member_ids")
    .map((v) => String(v).trim())
    .filter(Boolean);
  const unique = [...new Set(raw)];
  if (unique.length === 0) return [];

  const valid = await prisma.family_members.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      id: { in: unique },
    },
    select: { id: true },
  });
  const allowed = new Set(valid.map((r) => r.id));
  return unique.filter((id) => allowed.has(id));
}
