"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { parseInsurancePolicyType } from "@/lib/insurance-policy-type-labels";
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

  const policy_type =
    parseInsurancePolicyType(formData.get("policy_type") as string | null) ?? "car";

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const policy_number_raw = (formData.get("policy_number") as string | null)?.trim();
  const policy_number = policy_number_raw || null;

  const car_id_raw = (formData.get("car_id") as string | null)?.trim() || null;
  const family_member_id_raw =
    (formData.get("family_member_id") as string | null)?.trim() || null;

  const policy_start_date = parseDateInput(formData.get("policy_start_date") as string | null);
  const expiration_date = parseDateInput(formData.get("expiration_date") as string | null);
  const premium_paid = parseMoney(formData.get("premium_paid") as string | null);
  const premium_currency = ((formData.get("premium_currency") as string | null)?.trim() || "ILS").toUpperCase();

  let car_id: string | null = null;
  let family_member_id: string | null = null;

  if (policy_type === "car") {
    if (!car_id_raw) {
      redirect(
        "/dashboard/insurance-policies?error=Car+insurance+requires+a+vehicle",
      );
    }
    const car = await prisma.cars.findFirst({
      where: { id: car_id_raw, household_id: householdId },
    });
    if (!car) {
      redirect("/dashboard/insurance-policies?error=Invalid+car");
    }
    car_id = car_id_raw;
    if (family_member_id_raw) {
      const m = await prisma.family_members.findFirst({
        where: { id: family_member_id_raw, household_id: householdId, is_active: true },
      });
      if (!m) {
        redirect("/dashboard/insurance-policies?error=Invalid+family+member");
      }
      family_member_id = family_member_id_raw;
    }
  } else {
    if (car_id_raw) {
      redirect("/dashboard/insurance-policies?error=Only+car+policies+can+be+linked+to+a+vehicle");
    }
    if (family_member_id_raw) {
      const m = await prisma.family_members.findFirst({
        where: { id: family_member_id_raw, household_id: householdId, is_active: true },
      });
      if (!m) {
        redirect("/dashboard/insurance-policies?error=Invalid+family+member");
      }
      family_member_id = family_member_id_raw;
    }
  }

  if (!provider_name || !policy_name || !policy_start_date || !expiration_date || !premium_paid) {
    redirect(
      "/dashboard/insurance-policies?error=Provider%2C+policy+name%2C+start+date%2C+expiration%2C+and+premium+are+required",
    );
  }

  if (!/^[A-Z]{3}$/.test(premium_currency)) {
    redirect("/dashboard/insurance-policies?error=Use+a+3-letter+currency+code+%28e.g.+ILS%29");
  }

  await prisma.insurance_policies.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      policy_type,
      car_id,
      family_member_id,
      provider_name,
      policy_name,
      policy_number,
      policy_start_date,
      expiration_date,
      premium_paid,
      premium_currency,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/upcoming-renewals");
  revalidatePath("/dashboard/reports");
  if (car_id) {
    revalidatePath(`/dashboard/cars/${car_id}`);
  }
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
  revalidatePath("/dashboard/reports");
  if (row?.car_id) {
    revalidatePath(`/dashboard/cars/${row.car_id}`);
  }
  redirect("/dashboard/insurance-policies?updated=1");
}
