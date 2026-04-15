import type { Prisma } from "@/generated/prisma/client";

type PickerArgs = {
  householdId: string;
  familyMemberId?: string | null;
  /** Include these job IDs even if not flagged (e.g. already selected on a record). */
  includeJobIds?: readonly string[];
};

/** Active jobs offered in Private clinic job dropdowns. */
export function jobsWhereActiveForPrivateClinicPickers({
  householdId,
  familyMemberId,
  includeJobIds = [],
}: PickerArgs): Prisma.jobsWhereInput {
  const extras = includeJobIds.filter(Boolean);
  const or: Prisma.jobsWhereInput[] = [{ is_private_clinic: true }];
  if (extras.length) or.push({ id: { in: [...extras] } });
  return {
    household_id: householdId,
    is_active: true,
    ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
    OR: or,
  };
}

/** Use as `job: jobWhereInPrivateClinicModule` on therapy-related queries. */
export const jobWhereInPrivateClinicModule = { is_private_clinic: true } satisfies Prisma.jobsWhereInput;
