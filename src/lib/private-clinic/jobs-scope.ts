import type { Prisma } from "@/generated/prisma/client";
import { formatJobDisplayLabel } from "@/lib/job-label";

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

/**
 * Private-clinic jobs visible to the current user: all household private-clinic jobs,
 * or only those tied to the user's linked family member when set.
 */
export function jobWherePrivateClinicScoped(
  familyMemberId: string | null | undefined,
): Prisma.jobsWhereInput {
  return {
    ...jobWhereInPrivateClinicModule,
    ...(familyMemberId ? { family_member_id: familyMemberId } : {}),
  };
}

/**
 * Therapy clients that belong to this practitioner's private-clinic job(s).
 * When `familyMemberId` is null, returns `{}` (no extra filter — e.g. unlinked household admin).
 */
export function therapyClientsWhereLinkedPrivateClinicJobs(
  familyMemberId: string | null | undefined,
): Partial<Prisma.therapy_clientsWhereInput> {
  if (!familyMemberId) return {};
  return {
    OR: [
      { default_job: { is_private_clinic: true, family_member_id: familyMemberId } },
      {
        client_jobs: {
          some: { job: { is_private_clinic: true, family_member_id: familyMemberId } },
        },
      },
    ],
  };
}

export function formatPrivateClinicJobLabel(job: {
  job_title: string;
  employer_name: string | null;
}): string {
  return formatJobDisplayLabel(job);
}
