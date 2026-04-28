import { redirect } from "next/navigation";
import {
  getCurrentHouseholdId,
  getCurrentUiLanguage,
  prisma,
  requireHouseholdMember,
} from "@/lib/auth";
import { privateClinicGettingStarted, privateClinicJobs } from "@/lib/private-clinic-i18n";
import { createTherapyJob } from "../actions";
import { GettingStartedClient } from "./getting-started-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  welcome?: string;
  jobSaved?: string;
  error?: string;
}>;

export default async function PrivateClinicGettingStartedPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const session = await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const uiLanguage = await getCurrentUiLanguage();
  const gs = privateClinicGettingStarted(uiLanguage);
  const j = privateClinicJobs(uiLanguage);
  const resolved = searchParams ? await searchParams : undefined;

  const [settings, user, householdMembers] = await Promise.all([
    prisma.therapy_settings.findUnique({
      where: { household_id: householdId },
      select: { family_therapy_enabled: true },
    }),
    prisma.users.findFirst({
      where: { id: session.user.id, household_id: householdId, is_active: true },
      select: {
        family_member_id: true,
        private_clinic_getting_started_completed_at: true,
      },
    }),
    prisma.family_members.findMany({
      where: { household_id: householdId, is_active: true },
      orderBy: { full_name: "asc" },
      select: { id: true, full_name: true },
    }),
  ]);

  const familyMemberId = user?.family_member_id ?? null;
  const canAddJob = familyMemberId ? true : householdMembers.length > 0;
  const familyTherapyEnabled = Boolean(settings?.family_therapy_enabled);
  const showWelcomeBanner =
    resolved?.welcome === "1" && !user?.private_clinic_getting_started_completed_at;
  const showJobSetupHint = !canAddJob;

  return (
    <div className="space-y-8">
      {showJobSetupHint ? (
        <div className="rounded-xl border border-sky-700/50 bg-sky-950/30 px-4 py-3 text-sm text-sky-100">
          {!familyMemberId ? j.clinicUnlinkedHint : j.needMemberBeforeJob}
        </div>
      ) : null}

      <GettingStartedClient
        gs={gs}
        uiLanguage={uiLanguage}
        showWelcomeBanner={showWelcomeBanner}
        familyTherapyEnabled={familyTherapyEnabled}
        canAddJob={canAddJob}
        familyMemberId={familyMemberId}
        householdMembers={householdMembers}
        createTherapyJob={createTherapyJob}
      />
    </div>
  );
}
