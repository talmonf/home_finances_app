"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BASE = "/dashboard/private-clinic/reminders";

function redirectRemindersScoped(
  formData: FormData,
  kind: "success" | "error",
  fallbackPath: string,
  errorMessage?: string,
): never {
  const field = kind === "success" ? "redirect_on_success" : "redirect_on_error";
  let path = (formData.get(field) as string | null)?.trim() || fallbackPath;
  if (!path.startsWith(BASE)) path = fallbackPath;
  if (kind === "error" && errorMessage) {
    const sep = path.includes("?") ? "&" : "?";
    redirect(`${path}${sep}error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(path);
}

function parseDateOnly(raw: string | null | undefined): Date | null {
  const v = raw?.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function getCurrentUserFamilyMemberId(householdId: string): Promise<string | null> {
  const session = await requireHouseholdMember();
  const user = await prisma.users.findFirst({
    where: { id: session.user.id, household_id: householdId, is_active: true },
    select: { family_member_id: true },
  });
  return user?.family_member_id ?? null;
}

async function resolveFamilyMemberIdForManualReminder(
  householdId: string,
  formData: FormData,
): Promise<{ ok: true; family_member_id: string } | { ok: false }> {
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  if (userFm) return { ok: true, family_member_id: userFm };
  const raw = (formData.get("family_member_id") as string | null)?.trim() || "";
  if (!raw) return { ok: false };
  const m = await prisma.family_members.findFirst({
    where: { id: raw, household_id: householdId, is_active: true },
    select: { id: true },
  });
  if (!m) return { ok: false };
  return { ok: true, family_member_id: m.id };
}

function manualReminderScopeWhere(householdId: string, userFm: string | null) {
  return userFm
    ? { household_id: householdId, family_member_id: userFm }
    : { household_id: householdId };
}

export async function createPrivateClinicReminder(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const fallbackSuccess = `${BASE}?created=1`;
  const fallbackError = BASE;
  const resolvedFm = await resolveFamilyMemberIdForManualReminder(householdId, formData);
  if (!resolvedFm.ok) {
    redirectRemindersScoped(formData, "error", fallbackError, "Choose a family member.");
  }

  const reminder_date = parseDateOnly(formData.get("reminder_date") as string | null);
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  if (!reminder_date) {
    redirectRemindersScoped(formData, "error", fallbackError, "Invalid date");
  }

  await prisma.private_clinic_reminders.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      family_member_id: resolvedFm.family_member_id,
      reminder_date,
      category,
      description,
    },
  });

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirectRemindersScoped(formData, "success", fallbackSuccess);
}

export async function updatePrivateClinicReminder(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const fallbackSuccess = `${BASE}?updated=1`;
  const fallbackError = BASE;
  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirectRemindersScoped(formData, "error", fallbackError, "Missing id");

  const existing = await prisma.private_clinic_reminders.findFirst({
    where: { id, ...manualReminderScopeWhere(householdId, userFm) },
  });
  if (!existing) redirectRemindersScoped(formData, "error", fallbackError, "Not found");

  const reminder_date = parseDateOnly(formData.get("reminder_date") as string | null);
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const description = (formData.get("description") as string | null)?.trim() || null;
  if (!reminder_date) {
    redirectRemindersScoped(formData, "error", fallbackError, "Invalid date");
  }

  await prisma.private_clinic_reminders.update({
    where: { id },
    data: { reminder_date, category, description },
  });

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirectRemindersScoped(formData, "success", fallbackSuccess);
}

export async function deletePrivateClinicReminder(id: string) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) redirect("/");

  const userFm = await getCurrentUserFamilyMemberId(householdId);
  const result = await prisma.private_clinic_reminders.deleteMany({
    where: { id, ...manualReminderScopeWhere(householdId, userFm) },
  });
  if (result.count === 0) {
    redirect(`${BASE}?error=${encodeURIComponent("Not found")}`);
  }

  revalidatePath(BASE);
  revalidatePath("/dashboard/private-clinic");
  redirect(`${BASE}?deleted=1`);
}
