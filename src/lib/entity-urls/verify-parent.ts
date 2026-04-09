import { prisma } from "@/lib/auth";
import type { EntityUrlEntityKind } from "@/generated/prisma/enums";

/** Returns true when the target row exists and belongs to the household. */
export async function verifyEntityUrlParent(params: {
  householdId: string;
  entityKind: EntityUrlEntityKind;
  entityId: string;
}): Promise<boolean> {
  const { householdId, entityKind, entityId } = params;
  if (entityKind === "insurance_policy") {
    const row = await prisma.insurance_policies.findFirst({
      where: { id: entityId, household_id: householdId },
      select: { id: true },
    });
    return !!row;
  }
  if (entityKind === "savings_policy") {
    const row = await prisma.savings_policies.findFirst({
      where: { id: entityId, household_id: householdId },
      select: { id: true },
    });
    return !!row;
  }
  return false;
}
