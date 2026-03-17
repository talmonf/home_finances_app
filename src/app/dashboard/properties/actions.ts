"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProperty(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const name = (formData.get("name") as string | null)?.trim();
  const property_type = (formData.get("property_type") as string | null)?.trim() || null;
  const address = (formData.get("address") as string | null)?.trim() || null;
  const landlord_name = (formData.get("landlord_name") as string | null)?.trim() || null;
  const landlord_contact = (formData.get("landlord_contact") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!name) {
    redirect("/dashboard/properties?error=Name+is+required");
  }

  await prisma.properties.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      name,
      property_type,
      address,
      landlord_name,
      landlord_contact,
      notes,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/properties");
  redirect("/dashboard/properties?created=1");
}

export async function updateProperty(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/properties?error=Missing+id");

  const prop = await prisma.properties.findFirst({
    where: { id, household_id: householdId },
  });
  if (!prop) redirect("/dashboard/properties?error=Not+found");

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) {
    redirect(`/dashboard/properties/${id}?error=Name+is+required`);
  }

  const property_type = (formData.get("property_type") as string | null)?.trim() || null;
  const address = (formData.get("address") as string | null)?.trim() || null;
  const landlord_name = (formData.get("landlord_name") as string | null)?.trim() || null;
  const landlord_contact = (formData.get("landlord_contact") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  await prisma.properties.updateMany({
    where: { id, household_id: householdId },
    data: {
      name,
      property_type,
      address,
      landlord_name,
      landlord_contact,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${id}`);
  redirect("/dashboard/properties?updated=1");
}

const UTILITY_TYPES = ["electricity", "water", "internet", "telephone", "gas", "other"] as const;
type UtilityType = (typeof UTILITY_TYPES)[number];

function parseUtilityType(s: string | null): UtilityType {
  if (s && UTILITY_TYPES.includes(s as UtilityType)) return s as UtilityType;
  return "electricity";
}

export async function createUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/properties?error=No+household");

  const property_id = (formData.get("property_id") as string | null)?.trim();
  if (!property_id) return;

  const prop = await prisma.properties.findFirst({
    where: { id: property_id, household_id: householdId },
  });
  if (!prop) return;

  const utility_type = parseUtilityType((formData.get("utility_type") as string | null)?.trim() || null);
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  if (!provider_name) return;

  const payee_id = (formData.get("payee_id") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (!payee) return;
  }

  await prisma.property_utilities.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      property_id,
      utility_type,
      provider_name,
      payee_id: payee_id || null,
      account_number,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
}

export async function updateUtility(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  const id = (formData.get("id") as string | null)?.trim();
  const property_id = (formData.get("property_id") as string | null)?.trim();
  if (!id || !property_id) return;

  const util = await prisma.property_utilities.findFirst({
    where: { id, household_id: householdId, property_id },
  });
  if (!util) return;

  const utility_type = parseUtilityType((formData.get("utility_type") as string | null)?.trim() || null);
  const provider_name = (formData.get("provider_name") as string | null)?.trim();
  if (!provider_name) return;

  const payee_id = (formData.get("payee_id") as string | null)?.trim() || null;
  const account_number = (formData.get("account_number") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  let finalPayeeId: string | null = null;
  if (payee_id) {
    const payee = await prisma.payees.findFirst({
      where: { id: payee_id, household_id: householdId },
    });
    if (payee) finalPayeeId = payee_id;
  }

  await prisma.property_utilities.updateMany({
    where: { id, household_id: householdId },
    data: {
      utility_type,
      provider_name,
      payee_id: finalPayeeId,
      account_number,
      notes,
    },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
}

export async function deleteUtility(id: string, property_id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) return;

  await prisma.property_utilities.deleteMany({
    where: { id, household_id: householdId, property_id },
  });

  revalidatePath("/dashboard/properties");
  revalidatePath(`/dashboard/properties/${property_id}`);
}
