"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { orderSpouseIds } from "@/lib/hebrew-calendar";
import {
  gregorianDateToHebrewComponents,
} from "@/lib/hebrew-calendar";
import { parseWeddingHebrewFromFormData } from "@/lib/family-members/hebrew-dob-form";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseWeddingDate(raw: string | null): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return new Date(trimmed);
}

function resolveWeddingHebrewForSave(
  wedding: ReturnType<typeof parseWeddingHebrewFromFormData>,
  wedding_date: Date | null,
): ReturnType<typeof parseWeddingHebrewFromFormData> {
  if (
    wedding_date &&
    wedding.wedding_hebrew_day == null &&
    wedding.wedding_hebrew_month == null
  ) {
    const h = gregorianDateToHebrewComponents(wedding_date);
    return {
      wedding_hebrew_day: h.day,
      wedding_hebrew_month: h.month,
      wedding_hebrew_year: h.year ?? null,
    };
  }
  return wedding;
}

export async function createFamilyMarriage(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/marriages?error=No+household");

  const spouse_a_raw = (formData.get("spouse_a_id") as string | null)?.trim();
  const spouse_b_raw = (formData.get("spouse_b_id") as string | null)?.trim();
  if (!spouse_a_raw || !spouse_b_raw) {
    redirect("/dashboard/family-members/marriages/new?error=Both+spouses+required");
  }
  if (spouse_a_raw === spouse_b_raw) {
    redirect("/dashboard/family-members/marriages/new?error=Spouses+must+be+different");
  }

  const { spouse_a_id, spouse_b_id } = orderSpouseIds(spouse_a_raw, spouse_b_raw);
  const wedding_date = parseWeddingDate(formData.get("wedding_date") as string | null);

  let hebrew;
  try {
    hebrew = parseWeddingHebrewFromFormData(formData, "wedding");
  } catch {
    redirect("/dashboard/family-members/marriages/new?error=Invalid+Hebrew+wedding+date");
  }
  hebrew = resolveWeddingHebrewForSave(hebrew, wedding_date);

  const [a, b] = await Promise.all([
    prisma.family_members.findFirst({
      where: { id: spouse_a_id, household_id: householdId, is_active: true },
    }),
    prisma.family_members.findFirst({
      where: { id: spouse_b_id, household_id: householdId, is_active: true },
    }),
  ]);
  if (!a || !b) {
    redirect("/dashboard/family-members/marriages/new?error=Invalid+family+members");
  }

  await prisma.family_marriages.create({
    data: {
      household_id: householdId,
      spouse_a_id,
      spouse_b_id,
      wedding_date,
      ...hebrew,
    },
  });

  revalidatePath("/dashboard/family-members/marriages");
  redirect("/dashboard/family-members/marriages?created=1");
}

export async function updateFamilyMarriage(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/marriages?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/family-members/marriages?error=Missing+id");

  const existing = await prisma.family_marriages.findFirst({
    where: { id, household_id: householdId },
  });
  if (!existing) redirect("/dashboard/family-members/marriages?error=Not+found");

  const spouse_a_raw = (formData.get("spouse_a_id") as string | null)?.trim();
  const spouse_b_raw = (formData.get("spouse_b_id") as string | null)?.trim();
  if (!spouse_a_raw || !spouse_b_raw) {
    redirect(`/dashboard/family-members/marriages/${id}/edit?error=Both+spouses+required`);
  }
  if (spouse_a_raw === spouse_b_raw) {
    redirect(`/dashboard/family-members/marriages/${id}/edit?error=Spouses+must+be+different`);
  }

  const { spouse_a_id, spouse_b_id } = orderSpouseIds(spouse_a_raw, spouse_b_raw);
  const wedding_date = parseWeddingDate(formData.get("wedding_date") as string | null);

  let hebrew;
  try {
    hebrew = parseWeddingHebrewFromFormData(formData, "wedding");
  } catch {
    redirect(`/dashboard/family-members/marriages/${id}/edit?error=Invalid+Hebrew+wedding+date`);
  }
  hebrew = resolveWeddingHebrewForSave(hebrew, wedding_date);

  await prisma.family_marriages.updateMany({
    where: { id, household_id: householdId },
    data: {
      spouse_a_id,
      spouse_b_id,
      wedding_date,
      ...hebrew,
    },
  });

  revalidatePath("/dashboard/family-members/marriages");
  redirect("/dashboard/family-members/marriages?updated=1");
}

export async function deleteFamilyMarriage(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/marriages?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/family-members/marriages?error=Missing+id");

  await prisma.family_marriages.deleteMany({
    where: { id, household_id: householdId },
  });

  revalidatePath("/dashboard/family-members/marriages");
  redirect("/dashboard/family-members/marriages?deleted=1");
}
