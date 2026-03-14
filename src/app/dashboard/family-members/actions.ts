"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createFamilyMember(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/family-members?error=No+household");
  }

  const full_name = (formData.get("full_name") as string | null)?.trim();
  const date_of_birth_raw = (formData.get("date_of_birth") as string | null)?.trim();
  const id_number = (formData.get("id_number") as string | null)?.trim() || null;

  if (!full_name) {
    redirect("/dashboard/family-members?error=Name+is+required");
  }

  const date_of_birth = date_of_birth_raw ? new Date(date_of_birth_raw) : null;

  await prisma.family_members.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      full_name,
      date_of_birth,
      id_number,
    },
  });

  revalidatePath("/dashboard/family-members");
  redirect("/dashboard/family-members?created=1");
}

export async function toggleFamilyMemberActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/family-members?error=No+household");
  }

  await prisma.family_members.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/family-members");
  redirect("/dashboard/family-members?updated=1");
}
