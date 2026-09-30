"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentHouseholdId, prisma, requireHouseholdMember } from "@/lib/auth";
import { ensureTherapySettings } from "@/lib/therapy/bootstrap";
import { hashTreatmentIntakeToken } from "@/lib/therapy/treatment-intake";

const SETTINGS_PATH = "/dashboard/private-clinic/settings";

export async function generateTreatmentIntakeToken(): Promise<void> {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");
  await ensureTherapySettings(householdId);
  const token = randomBytes(32).toString("base64url");
  await prisma.therapy_settings.update({
    where: { household_id: householdId },
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
