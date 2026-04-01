"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createInsurancePolicy(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim() || null;
  const car_id = (formData.get("car_id") as string | null)?.trim() || null;
  const expiration_date_raw = (formData.get("expiration_date") as string | null)?.trim();

  if (!provider_name || !policy_name || !expiration_date_raw) {
    redirect("/dashboard/insurance-policies?error=Provider,+policy+name+and+expiration+date+required");
  }

  const expiration_date = new Date(expiration_date_raw);
  if (Number.isNaN(expiration_date.getTime())) {
    redirect("/dashboard/insurance-policies?error=Invalid+expiration+date");
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId },
    });
    if (!member) {
      redirect("/dashboard/insurance-policies?error=Invalid+family+member");
    }
  }
  if (car_id) {
    const car = await prisma.cars.findFirst({
      where: { id: car_id, household_id: householdId },
    });
    if (!car) {
      redirect("/dashboard/insurance-policies?error=Invalid+car");
    }
  }

  await prisma.insurance_policies.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      car_id,
      provider_name,
      policy_name,
      expiration_date,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/insurance-policies?created=1");
}

export async function toggleInsurancePolicyActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  await prisma.insurance_policies.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  redirect("/dashboard/insurance-policies?updated=1");
}

