"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { parseFamilySpecialDateEventType } from "@/lib/family-special-dates/event-type-labels";
import { parseWeddingHebrewFromFormData } from "@/lib/family-members/hebrew-dob-form";
import { gregorianDateToHebrewComponents } from "@/lib/hebrew-calendar";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseGregorianDate(raw: string | null): Date | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return new Date(trimmed);
}

function parseEventHebrewFromFormData(formData: FormData): {
  hebrew_day: number | null;
  hebrew_month: number | null;
  hebrew_year: number | null;
} {
  const parsed = parseWeddingHebrewFromFormData(formData, "event");
  return {
    hebrew_day: parsed.wedding_hebrew_day,
    hebrew_month: parsed.wedding_hebrew_month,
    hebrew_year: parsed.wedding_hebrew_year,
  };
}

function resolveEventHebrewForSave(
  hebrew: ReturnType<typeof parseEventHebrewFromFormData>,
  gregorian_date: Date | null,
): ReturnType<typeof parseEventHebrewFromFormData> {
  if (gregorian_date && hebrew.hebrew_day == null && hebrew.hebrew_month == null) {
    const h = gregorianDateToHebrewComponents(gregorian_date);
    return {
      hebrew_day: h.day,
      hebrew_month: h.month,
      hebrew_year: h.year ?? null,
    };
  }
  return hebrew;
}

type ParsedSpecialDateForm = {
  family_member_id: string | null;
  display_name: string | null;
  event_type: NonNullable<ReturnType<typeof parseFamilySpecialDateEventType>>;
  event_type_other: string | null;
  gregorian_date: Date | null;
  hebrew_day: number | null;
  hebrew_month: number | null;
  hebrew_year: number | null;
  notes: string | null;
};

async function parseSpecialDateForm(
  formData: FormData,
  householdId: string,
  errorRedirect: string,
): Promise<ParsedSpecialDateForm> {
  const family_member_id_raw = (formData.get("family_member_id") as string | null)?.trim();
  const family_member_id = family_member_id_raw || null;
  const display_name = (formData.get("display_name") as string | null)?.trim() || null;

  const event_type = parseFamilySpecialDateEventType(formData.get("event_type") as string | null);
  if (!event_type) redirect(`${errorRedirect}?error=Invalid+event+type`);

  const event_type_other = (formData.get("event_type_other") as string | null)?.trim() || null;
  if (event_type === "other" && !event_type_other) {
    redirect(`${errorRedirect}?error=Event+type+description+required`);
  }

  if (!family_member_id && !display_name) {
    redirect(`${errorRedirect}?error=Display+name+required+when+no+family+member`);
  }

  const gregorian_date = parseGregorianDate(formData.get("gregorian_date") as string | null);

  let hebrew;
  try {
    hebrew = parseEventHebrewFromFormData(formData);
  } catch {
    redirect(`${errorRedirect}?error=Invalid+Hebrew+date`);
  }
  hebrew = resolveEventHebrewForSave(hebrew, gregorian_date);

  if (!gregorian_date && (hebrew.hebrew_day == null || hebrew.hebrew_month == null)) {
    redirect(`${errorRedirect}?error=At+least+one+date+required`);
  }

  if (family_member_id) {
    const member = await prisma.family_members.findFirst({
      where: { id: family_member_id, household_id: householdId, is_active: true },
    });
    if (!member) redirect(`${errorRedirect}?error=Invalid+family+member`);
  }

  const notes = (formData.get("notes") as string | null)?.trim() || null;

  return {
    family_member_id,
    display_name: family_member_id ? null : display_name,
    event_type,
    event_type_other: event_type === "other" ? event_type_other : null,
    gregorian_date,
    ...hebrew,
    notes,
  };
}

export async function createFamilySpecialDate(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/special-dates?error=No+household");

  const data = await parseSpecialDateForm(
    formData,
    householdId,
    "/dashboard/family-members/special-dates/new",
  );

  await prisma.family_special_dates.create({
    data: {
      household_id: householdId,
      ...data,
    },
  });

  revalidatePath("/dashboard/family-members/special-dates");
  redirect("/dashboard/family-members/special-dates?created=1");
}

export async function updateFamilySpecialDate(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/special-dates?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/family-members/special-dates?error=Missing+id");

  const existing = await prisma.family_special_dates.findFirst({
    where: { id, household_id: householdId },
  });
  if (!existing) redirect("/dashboard/family-members/special-dates?error=Not+found");

  const data = await parseSpecialDateForm(
    formData,
    householdId,
    `/dashboard/family-members/special-dates/${id}/edit`,
  );

  await prisma.family_special_dates.updateMany({
    where: { id, household_id: householdId },
    data,
  });

  revalidatePath("/dashboard/family-members/special-dates");
  redirect("/dashboard/family-members/special-dates?updated=1");
}

export async function deleteFamilySpecialDate(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/dashboard/family-members/special-dates?error=No+household");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect("/dashboard/family-members/special-dates?error=Missing+id");

  await prisma.family_special_dates.deleteMany({
    where: { id, household_id: householdId },
  });

  revalidatePath("/dashboard/family-members/special-dates");
  redirect("/dashboard/family-members/special-dates?deleted=1");
}
