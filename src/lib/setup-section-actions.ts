"use server";

import { prisma, getCurrentHouseholdId, requireHouseholdMember } from "@/lib/auth";
import { isSetupSectionId } from "@/lib/setup-section-ids";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleSetupSectionDone(formData: FormData) {
  await requireHouseholdMember();

  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const sectionId = String(formData.get("section_id") ?? "");
  const nextIsDone = String(formData.get("next_is_done") ?? "false") === "true";
  const redirectToRaw = String(formData.get("redirect_to") ?? "/").trim();
  const redirectTo = redirectToRaw || "/";

  if (!isSetupSectionId(sectionId)) {
    redirect("/");
  }

  await prisma.household_section_statuses.upsert({
    where: {
      household_id_section_id: {
        household_id: householdId,
        section_id: sectionId,
      },
    },
    update: { is_done: nextIsDone },
    create: {
      id: crypto.randomUUID(),
      household_id: householdId,
      section_id: sectionId,
      is_done: nextIsDone,
    },
  });

  revalidatePath("/");
  if (redirectTo !== "/") {
    revalidatePath(redirectTo);
  }
  redirect(redirectTo);
}
