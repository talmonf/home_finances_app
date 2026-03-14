"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createStudyOrClass(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/studies-and-classes?error=No+household");
  }

  const name = (formData.get("name") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const family_member_id = (formData.get("family_member_id") as string | null)?.trim();
  const start_date_raw = (formData.get("start_date") as string | null)?.trim();
  const end_date_raw = (formData.get("end_date") as string | null)?.trim();
  const expected_annual_cost_raw = (formData.get("expected_annual_cost") as string | null)?.trim();
  const number_of_years_raw = (formData.get("number_of_years") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!name || !type || (type !== "study" && type !== "class")) {
    redirect("/dashboard/studies-and-classes?error=Name+and+type+required");
  }
  if (!family_member_id) {
    redirect("/dashboard/studies-and-classes?error=Family+member+required");
  }

  // Ensure family member belongs to this household
  const member = await prisma.family_members.findFirst({
    where: { id: family_member_id, household_id: householdId },
  });
  if (!member) {
    redirect("/dashboard/studies-and-classes?error=Invalid+family+member");
  }

  const start_date = start_date_raw ? new Date(start_date_raw) : null;
  const end_date = end_date_raw ? new Date(end_date_raw) : null;
  const expected_annual_cost = expected_annual_cost_raw
    ? parseFloat(expected_annual_cost_raw)
    : null;
  const number_of_years = number_of_years_raw ? parseInt(number_of_years_raw, 10) : null;

  await prisma.studies_and_classes.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id,
      name,
      type: type as "study" | "class",
      start_date,
      end_date,
      expected_annual_cost,
      number_of_years,
      description,
    },
  });

  revalidatePath("/dashboard/studies-and-classes");
  redirect("/dashboard/studies-and-classes?created=1");
}

export async function toggleStudyOrClassActive(id: string, nextActive: boolean) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/dashboard/studies-and-classes?error=No+household");
  }

  await prisma.studies_and_classes.updateMany({
    where: { id, household_id: householdId },
    data: { is_active: nextActive },
  });

  revalidatePath("/dashboard/studies-and-classes");
  redirect("/dashboard/studies-and-classes?updated=1");
}
