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

const LIST_FILTER_IDENTITY_TYPES = ["passport", "national_id", "driver_license", "other"] as const;
const LIST_SORT_KEYS = [
  "family_member",
  "identity_type",
  "identity_type_other",
  "identifier",
  "expiry_date",
] as const;

/** Preserves list filters/sort when redirecting after create/update (via hidden form fields). */
function redirectToIdentitiesList(formData: FormData, flash: Record<string, string | undefined>): never {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(flash)) {
    if (v !== undefined && v !== "") {
      p.set(k, v);
    }
  }
  const fm = (formData.get("redirect_family_member_id") as string | null)?.trim();
  if (fm && fm !== "all" && /^[0-9a-f-]{36}$/i.test(fm)) {
    p.set("family_member_id", fm);
  }
  const it = (formData.get("redirect_identity_type") as string | null)?.trim();
  if (it && it !== "all" && (LIST_FILTER_IDENTITY_TYPES as readonly string[]).includes(it)) {
    p.set("identity_type", it);
  }
  const sort = (formData.get("redirect_sort") as string | null)?.trim();
  if (sort && (LIST_SORT_KEYS as readonly string[]).includes(sort)) {
    p.set("sort", sort);
  }
  const sortDir = (formData.get("redirect_dir") as string | null)?.trim();
  if (sortDir === "asc" || sortDir === "desc") {
    p.set("dir", sortDir);
  }
  const qs = p.toString();
  redirect(qs ? `/dashboard/identities?${qs}` : "/dashboard/identities");
}

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
    redirectToIdentitiesList(formData, { error: "No household" });
  }

  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const identity_type_raw = (formData.get("identity_type") as string | null)?.trim();
  const identity_type_other = (formData.get("identity_type_other") as string | null)?.trim() || null;
  const identifier = (formData.get("identifier") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim();

  if (!family_member_id || !identity_type_raw || !expiry_date_raw) {
    redirectToIdentitiesList(formData, {
      error: "Family member, type and expiry date required",
    });
  }

  const identity_type = parseIdentityType(identity_type_raw);
  if (identity_type === "other" && !identity_type_other) {
    redirectToIdentitiesList(formData, { error: "Other type is required" });
  }

  const expiry_date = new Date(expiry_date_raw);
  if (Number.isNaN(expiry_date.getTime())) {
    redirectToIdentitiesList(formData, { error: "Invalid expiry date" });
  }

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) {
    redirectToIdentitiesList(formData, { error: "Invalid family member" });
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
  redirectToIdentitiesList(formData, { created: "1" });
}

export async function updateIdentity(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirectToIdentitiesList(formData, { error: "No household" });
  }

  const id = (formData.get("id") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const identity_type_raw = (formData.get("identity_type") as string | null)?.trim();
  const identity_type_other = (formData.get("identity_type_other") as string | null)?.trim() || null;
  const identifier = (formData.get("identifier") as string | null)?.trim() || null;
  const notes = (formData.get("notes") as string | null)?.trim() || null;
  const expiry_date_raw = (formData.get("expiry_date") as string | null)?.trim();

  if (!id || !family_member_id || !identity_type_raw || !expiry_date_raw) {
    redirectToIdentitiesList(formData, { error: "Required fields missing" });
  }

  const identity_type = parseIdentityType(identity_type_raw);
  if (identity_type === "other" && !identity_type_other) {
    redirectToIdentitiesList(formData, { error: "Other type is required" });
  }

  const expiry_date = new Date(expiry_date_raw);
  if (Number.isNaN(expiry_date.getTime())) {
    redirectToIdentitiesList(formData, { error: "Invalid expiry date" });
  }

  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) {
    redirectToIdentitiesList(formData, { error: "Invalid family member" });
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
  redirectToIdentitiesList(formData, { updated: "1" });
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

