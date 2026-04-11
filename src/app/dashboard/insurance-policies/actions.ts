"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { parseInsurancePolicyType } from "@/lib/insurance-policy-type-labels";
import type { InsurancePolicyType } from "@/generated/prisma/enums";
import { CLINIC_INSURANCE_POLICY_TYPES } from "@/lib/private-clinic/constants";
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

function optionalText(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  return v ? v : null;
}

const CLINIC_POLICY_TYPE_SET = new Set<string>(CLINIC_INSURANCE_POLICY_TYPES);

function insuranceFormContext(formData: FormData): "main" | "clinic" {
  const v = (formData.get("insurance_form_context") as string | null)?.trim();
  return v === "clinic" ? "clinic" : "main";
}

function revalidateInsuranceRelatedPaths(carId: string | null) {
  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/private-clinic/clinic-insurance");
  revalidatePath("/dashboard/private-clinic/reminders");
  revalidatePath("/dashboard/upcoming-renewals");
  revalidatePath("/dashboard/reports");
  if (carId) {
    revalidatePath(`/dashboard/cars/${carId}`);
  }
}

function redirectInsurance(context: "main" | "clinic", search: string) {
  const base =
    context === "clinic"
      ? "/dashboard/private-clinic/clinic-insurance"
      : "/dashboard/insurance-policies";
  const q = search.startsWith("?") ? search : `?${search}`;
  redirect(`${base}${q}`);
}

async function resolveCarAndFamilyMember(
  householdId: string,
  policy_type: InsurancePolicyType,
  car_id_raw: string | null,
  family_member_id_raw: string | null,
): Promise<{ car_id: string | null; family_member_id: string | null; error: string | null }> {
  let car_id: string | null = null;
  let family_member_id: string | null = null;

  if (policy_type === "car") {
    if (!car_id_raw) {
      return { car_id: null, family_member_id: null, error: "Car+insurance+requires+a+vehicle" };
    }
    const car = await prisma.cars.findFirst({
      where: { id: car_id_raw, household_id: householdId },
    });
    if (!car) {
      return { car_id: null, family_member_id: null, error: "Invalid+car" };
    }
    car_id = car_id_raw;
    if (family_member_id_raw) {
      const m = await prisma.family_members.findFirst({
        where: { id: family_member_id_raw, household_id: householdId, is_active: true },
      });
      if (!m) {
        return { car_id: null, family_member_id: null, error: "Invalid+family+member" };
      }
      family_member_id = family_member_id_raw;
    }
  } else {
    if (car_id_raw) {
      return {
        car_id: null,
        family_member_id: null,
        error: "Only+car+policies+can+be+linked+to+a+vehicle",
      };
    }
    if (family_member_id_raw) {
      const m = await prisma.family_members.findFirst({
        where: { id: family_member_id_raw, household_id: householdId, is_active: true },
      });
      if (!m) {
        return { car_id: null, family_member_id: null, error: "Invalid+family+member" };
      }
      family_member_id = family_member_id_raw;
    }
  }

  return { car_id, family_member_id, error: null };
}

export async function createInsurancePolicy(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const context = insuranceFormContext(formData);

  const policy_type =
    parseInsurancePolicyType(formData.get("policy_type") as string | null) ?? "car";

  if (context === "clinic" && !CLINIC_POLICY_TYPE_SET.has(policy_type)) {
    redirectInsurance(context, "error=Invalid+clinic+policy+type");
  }

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const policy_number_raw = (formData.get("policy_number") as string | null)?.trim();
  const policy_number = policy_number_raw || null;
  const contact_phone = optionalText(formData.get("contact_phone") as string | null);
  const contact_email = optionalText(formData.get("contact_email") as string | null);
  const website_url = optionalText(formData.get("website_url") as string | null);

  const car_id_raw = (formData.get("car_id") as string | null)?.trim() || null;
  const family_member_id_raw =
    (formData.get("family_member_id") as string | null)?.trim() || null;

  const policy_start_date = parseDateInput(formData.get("policy_start_date") as string | null);
  const expiration_date = parseDateInput(formData.get("expiration_date") as string | null);
  const premium_paid = parseMoney(formData.get("premium_paid") as string | null);
  const premium_currency = ((formData.get("premium_currency") as string | null)?.trim() || "ILS").toUpperCase();

  const resolved = await resolveCarAndFamilyMember(
    householdId,
    policy_type,
    car_id_raw,
    family_member_id_raw,
  );
  if (resolved.error) {
    redirectInsurance(context, `error=${resolved.error}`);
  }

  if (!provider_name || !policy_name || !policy_start_date || !expiration_date || !premium_paid) {
    redirectInsurance(
      context,
      "error=Provider%2C+policy+name%2C+start+date%2C+expiration%2C+and+premium+are+required",
    );
  }

  if (!/^[A-Z]{3}$/.test(premium_currency)) {
    redirectInsurance(context, "error=Use+a+3-letter+currency+code+%28e.g.+ILS%29");
  }

  const pn = provider_name as string;
  const pnm = policy_name as string;
  const psd = policy_start_date as Date;
  const exp = expiration_date as Date;
  const prem = premium_paid as string;

  await prisma.insurance_policies.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      policy_type,
      car_id: resolved.car_id,
      family_member_id: resolved.family_member_id,
      provider_name: pn,
      policy_name: pnm,
      policy_number: policy_number ?? undefined,
      contact_phone: contact_phone ?? undefined,
      contact_email: contact_email ?? undefined,
      website_url: website_url ?? undefined,
      policy_start_date: psd,
      expiration_date: exp,
      premium_paid: prem,
      premium_currency,
      is_active: true,
    },
  });

  revalidateInsuranceRelatedPaths(resolved.car_id);
  const base =
    context === "clinic"
      ? "/dashboard/private-clinic/clinic-insurance"
      : "/dashboard/insurance-policies";
  redirect(`${base}?created=1`);
}

export async function updateInsurancePolicy(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const context = insuranceFormContext(formData);
  const id = (formData.get("policy_id") as string | null)?.trim();
  if (!id) {
    redirectInsurance(context, "error=Missing+policy+id");
  }

  const existing = await prisma.insurance_policies.findFirst({
    where: { id, household_id: householdId },
  });
  if (!existing) {
    redirectInsurance(context, "error=Policy+not+found");
  }

  const policy_type =
    parseInsurancePolicyType(formData.get("policy_type") as string | null) ?? existing!.policy_type;

  if (context === "clinic" && !CLINIC_POLICY_TYPE_SET.has(policy_type)) {
    redirectInsurance(context, "error=Invalid+clinic+policy+type");
  }

  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  const policy_name = (formData.get("policy_name") as string | null)?.trim();
  const policy_number_raw = (formData.get("policy_number") as string | null)?.trim();
  const policy_number = policy_number_raw || null;
  const contact_phone = optionalText(formData.get("contact_phone") as string | null);
  const contact_email = optionalText(formData.get("contact_email") as string | null);
  const website_url = optionalText(formData.get("website_url") as string | null);

  const car_id_raw = (formData.get("car_id") as string | null)?.trim() || null;
  const family_member_id_raw =
    (formData.get("family_member_id") as string | null)?.trim() || null;

  const policy_start_date = parseDateInput(formData.get("policy_start_date") as string | null);
  const expiration_date = parseDateInput(formData.get("expiration_date") as string | null);
  const premium_paid = parseMoney(formData.get("premium_paid") as string | null);
  const premium_currency = ((formData.get("premium_currency") as string | null)?.trim() || "ILS").toUpperCase();

  const resolved = await resolveCarAndFamilyMember(
    householdId,
    policy_type,
    car_id_raw,
    family_member_id_raw,
  );
  if (resolved.error) {
    redirectInsurance(context, `error=${resolved.error}`);
  }

  if (!provider_name || !policy_name || !policy_start_date || !expiration_date || !premium_paid) {
    redirectInsurance(
      context,
      "error=Provider%2C+policy+name%2C+start+date%2C+expiration%2C+and+premium+are+required",
    );
  }

  if (!/^[A-Z]{3}$/.test(premium_currency)) {
    redirectInsurance(context, "error=Use+a+3-letter+currency+code+%28e.g.+ILS%29");
  }

  const pnU = provider_name as string;
  const pnmU = policy_name as string;
  const psdU = policy_start_date as Date;
  const expU = expiration_date as Date;
  const premU = premium_paid as string;

  await prisma.insurance_policies.update({
    where: { id },
    data: {
      policy_type,
      car_id: resolved.car_id,
      family_member_id: resolved.family_member_id,
      provider_name: pnU,
      policy_name: pnmU,
      policy_number: policy_number ?? undefined,
      contact_phone: contact_phone ?? undefined,
      contact_email: contact_email ?? undefined,
      website_url: website_url ?? undefined,
      policy_start_date: psdU,
      expiration_date: expU,
      premium_paid: premU,
      premium_currency,
    },
  });

  revalidateInsuranceRelatedPaths(resolved.car_id);
  const base =
    context === "clinic"
      ? "/dashboard/private-clinic/clinic-insurance"
      : "/dashboard/insurance-policies";
  redirect(`${base}?updated=1`);
}

export async function toggleInsurancePolicyActive(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/insurance-policies?error=No+household");
  }

  const id = (formData.get("policy_id") as string | null)?.trim();
  const nextRaw = (formData.get("next_active") as string | null)?.trim();
  const context = insuranceFormContext(formData);
  if (!id || (nextRaw !== "0" && nextRaw !== "1")) {
    redirectInsurance(context, "error=Invalid+toggle");
  }
  const nextActive = nextRaw === "1";

  const row = await prisma.insurance_policies.findFirst({
    where: { id, household_id: householdId },
    select: { car_id: true },
  });

  await prisma.insurance_policies.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidateInsuranceRelatedPaths(row?.car_id ?? null);
  const base =
    context === "clinic"
      ? "/dashboard/private-clinic/clinic-insurance"
      : "/dashboard/insurance-policies";
  redirect(`${base}?updated=1`);
}
