"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthSession, getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import { hashTreatmentIntakeToken } from "@/lib/therapy/treatment-intake";

const SETTINGS_PATH = "/dashboard/private-clinic/settings";

export async function generateTreatmentIntakeToken(): Promise<void> {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) redirect("/");
  const user = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId, is_active: true },
    select: { id: true, family_member_id: true },
  });
  if (!user) redirect("/");
  if (!user.family_member_id) {
    redirect(`${SETTINGS_PATH}?intake=error&intakeReason=unlinked`);
  }
  const token = randomBytes(32).toString("base64url");
  await prisma.users.update({
    where: { id: user.id },
    data: {
      treatment_intake_token_hash: hashTreatmentIntakeToken(token),
      treatment_intake_token_last4: token.slice(-4),
    },
  });
  revalidatePath(SETTINGS_PATH);
  const params = new URLSearchParams();
  params.set("intake", "created");
  params.set("intakeToken", token);
  redirect(`${SETTINGS_PATH}?${params.toString()}`);
}
