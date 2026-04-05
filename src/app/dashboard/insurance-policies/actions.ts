"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseDateInput(raw: string | null | undefined): Date | null {
  const v = raw?.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseMoney(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

export async function createInsurancePolicy(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const car_id = (formData.get("car_id") as string | null)?.trim() || null;
  const policy_start_date = parseDateInput(formData.get("policy_start_date") as string | null);
  const expiration_date = parseDateInput(formData.get("expiration_date") as string | null);
  const premium_paid = parseMoney(formData.get("premium_paid") as string | null);
  const premium_currency = ((formData.get("premium_currency") as string | null)?.trim() || "ILS").toUpperCase();

  if (!provider_name || !policy_name || !car_id || !policy_start_date || !expiration_date || !premium_paid) {
    redirect(
      "/dashboard/insurance-policies?error=Provider%2C+policy%2C+car%2C+start+date%2C+expiration%2C+and+premium+are+required",
    );
  }

  if (!/^[A-Z]{3}$/.test(premium_currency)) {
    redirect("/dashboard/insurance-policies?error=Use+a+3-letter+currency+code+%28e.g.+ILS%29");
  }

  const car = await prisma.cars.findFirst({
    where: { id: car_id, household_id: householdId },
  });
  if (!car) {
    redirect("/dashboard/insurance-policies?error=Invalid+car");
  }

  await prisma.insurance_policies.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      car_id,
      provider_name,
      policy_name,
      policy_start_date,
      expiration_date,
      premium_paid,
      premium_currency,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  revalidatePath(`/dashboard/cars/${car_id}`);
  redirect("/dashboard/insurance-policies?created=1");
}

export async function toggleInsurancePolicyActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const row = await prisma.insurance_policies.findFirst({
    where: { id, household_id: householdId },
    select: { car_id: true },
  });

  await prisma.insurance_policies.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  if (row) {
    revalidatePath(`/dashboard/cars/${row.car_id}`);
  }
  redirect("/dashboard/insurance-policies?updated=1");
}
