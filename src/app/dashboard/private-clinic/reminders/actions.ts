"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BASE = "/dashboard/private-clinic/reminders";

function parseDateOnly(raw: string | null | undefined): Date | null {
  const v = raw?.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPrivateClinicReminder(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const reminder_date = parseDateOnly(formData.get("reminder_date") as string | null);
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  if (!reminder_date) {
    redirect(`${BASE}?error=Invalid+date`);
  }

  await prisma.private_clinic_reminders.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      reminder_date,
      category,
      description,
    },
  });

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirect(`${BASE}?created=1`);
}

export async function updatePrivateClinicReminder(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect(`${BASE}?error=Missing+id`);

  const existing = await prisma.private_clinic_reminders.findFirst({
    where: { id, household_id: householdId },
  });
  if (!existing) redirect(`${BASE}?error=Not+found`);

  const reminder_date = parseDateOnly(formData.get("reminder_date") as string | null);
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  if (!reminder_date) {
    redirect(`${BASE}?error=Invalid+date`);
  }

  await prisma.private_clinic_reminders.update({
    where: { id },
    data: { reminder_date, category, description },
  });

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirect(`${BASE}?updated=1`);
}

export async function deletePrivateClinicReminder(id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  await prisma.private_clinic_reminders.deleteMany({
    where: { id, household_id: householdId },
  });

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirect(`${BASE}?deleted=1`);
}
