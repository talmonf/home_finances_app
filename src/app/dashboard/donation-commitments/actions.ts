"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createDonationCommitment(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donation-commitments?error=No+household");
  }

  const payee_id = (formData.get("payee_id") as string | null)?.trim();
  const renewal_date_raw = (formData.get("renewal_date") as string | null)?.trim();
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!payee_id || !renewal_date_raw) {
    redirect("/dashboard/donation-commitments?error=Charity+and+renewal+date+required");
  }

  const renewal_date = new Date(renewal_date_raw);
  if (Number.isNaN(renewal_date.getTime())) {
    redirect("/dashboard/donation-commitments?error=Invalid+renewal+date");
  }

  const payee = await prisma.payees.findFirst({
    where: { id: payee_id, household_id: householdId },
  });
  if (!payee) {
    redirect("/dashboard/donation-commitments?error=Invalid+charity");
  }

  await prisma.donation_commitments.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      payee_id,
      renewal_date,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/donation-commitments");
  redirect("/dashboard/donation-commitments?created=1");
}

export async function toggleDonationCommitmentActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/donation-commitments?error=No+household");
  }

  await prisma.donation_commitments.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/donation-commitments");
  redirect("/dashboard/donation-commitments?updated=1");
}

