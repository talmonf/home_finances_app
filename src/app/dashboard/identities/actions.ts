"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const IDENTITY_TYPES = [
  "passport",
  "national_id",
  "driver_license",
  "car_license",
  "other",
] as const;

type IdentityType = (typeof IDENTITY_TYPES)[number];

function parseIdentityType(value: string | null): IdentityType {
  if (value && IDENTITY_TYPES.includes(value as IdentityType)) {
    return value as IdentityType;
  }
  return "other";
}

export async function createIdentity(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/identities?error=No+household");
  }

  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const identity_type_raw = (formData.get("identity_type") as string | null)?.trim();
  const identity_type_other = (formData.get("identity_type_other") as string | null)?.trim() || null;
  const identifier = (formData.get("identifier") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim();

  if (!family_member_id || !identity_type_raw || !expiry_date_raw) {
    redirect("/dashboard/identities?error=Family+member,+type+and+expiry+date+required");
  }

  const identity_type = parseIdentityType(identity_type_raw);
  if (identity_type === "other" && !identity_type_other) {
    redirect("/dashboard/identities?error=Other+type+is+required");
  }

  const expiry_date = new Date(expiry_date_raw);
  if (Number.isNaN(expiry_date.getTime())) {
    redirect("/dashboard/identities?error=Invalid+expiry+date");
  }

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) {
    redirect("/dashboard/identities?error=Invalid+family+member");
  }

  await prisma.identities.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      identity_type,
      identity_type_other,
      identifier,
      notes,
      expiry_date,
      is_active: true,
    },
  });

  revalidatePath("/dashboard/identities");
  redirect("/dashboard/identities?created=1");
}

export async function updateIdentity(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/identities?error=No+household");
  }

  const id = (formData.get("id") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const identity_type_raw = (formData.get("identity_type") as string | null)?.trim();
  const identity_type_other = (formData.get("identity_type_other") as string | null)?.trim() || null;
  const identifier = (formData.get("identifier") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim();

  if (!id || !family_member_id || !identity_type_raw || !expiry_date_raw) {
    redirect("/dashboard/identities?error=Required+fields+missing");
  }

  const identity_type = parseIdentityType(identity_type_raw);
  if (identity_type === "other" && !identity_type_other) {
    redirect("/dashboard/identities?error=Other+type+is+required");
  }

  const expiry_date = new Date(expiry_date_raw);
  if (Number.isNaN(expiry_date.getTime())) {
    redirect("/dashboard/identities?error=Invalid+expiry+date");
  }

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) {
    redirect("/dashboard/identities?error=Invalid+family+member");
  }

  await prisma.identities.updateMany({
    where: { id, household_id: householdId },
    data: {
      family_member_id,
      identity_type,
      identity_type_other,
      identifier,
      notes,
      expiry_date,
    },
  });

  revalidatePath("/dashboard/identities");
  redirect("/dashboard/identities?updated=1");
}

export async function toggleIdentityActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/identities?error=No+household");
  }

  await prisma.identities.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/identities");
  redirect("/dashboard/identities?updated=1");
}

