"use server";

import { prisma, getAuthSession } from "@/lib/auth";
import {
  normalizeAndValidateUrl,
  parseSortOrder,
  trimOptionalField,
  MAX_NOTES_LEN,
  MAX_TITLE_LEN,
} from "@/lib/entity-urls/validate";
import { parseDashboardSectionId } from "@/lib/useful-links/parse-section-id";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSuperAdminSession() {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }
  return session;
}

export async function createSystemUsefulLink(formData: FormData) {
  await requireSuperAdminSession();

  const sectionId = parseDashboardSectionId(formData.get("section_id") as string | null);
  if (!sectionId) {
    redirect("/admin/useful-links?error=section");
  }

  const url = normalizeAndValidateUrl(formData.get("url") as string | null);
  if (!url) {
    redirect("/admin/useful-links?error=url");
  }

  const title = trimOptionalField(formData.get("title") as string | null, MAX_TITLE_LEN);
  const notes = trimOptionalField(formData.get("notes") as string | null, MAX_NOTES_LEN);
  const sort_order = parseSortOrder(formData.get("sort_order") as string | null);

  await prisma.useful_links.create({
    data: {
      id: crypto.randomUUID(),
      scope: "system",
      section_id: sectionId,
      household_id: null,
      user_id: null,
      url: url!,
      title,
      notes,
      sort_order,
      is_active: true,
    },
  });

  revalidatePath("/admin/useful-links");
  revalidatePath("/dashboard", "layout");
  redirect(`/admin/useful-links?section=${encodeURIComponent(sectionId)}&saved=1`);
}

export async function deleteSystemUsefulLink(formData: FormData) {
  await requireSuperAdminSession();

  const id = (formData.get("id") as string | null)?.trim();
  const sectionFallback = (formData.get("section_id") as string | null)?.trim() || "cars";
  if (!id) {
    redirect(`/admin/useful-links?section=${encodeURIComponent(sectionFallback)}&error=id`);
  }

  await prisma.useful_links.deleteMany({
    where: { id, scope: "system" },
  });

  revalidatePath("/admin/useful-links");
  revalidatePath("/dashboard", "layout");
  redirect(`/admin/useful-links?section=${encodeURIComponent(sectionFallback)}&saved=1`);
}

export async function createHouseholdUsefulLink(formData: FormData) {
  await requireSuperAdminSession();

  const householdId = (formData.get("household_id") as string | null)?.trim();
  if (!householdId) {
    redirect("/admin/households?error=household");
  }

  const sectionId = parseDashboardSectionId(formData.get("section_id") as string | null);
  if (!sectionId) {
    redirect(`/admin/households/${householdId}/edit?usefulError=section`);
  }

  const url = normalizeAndValidateUrl(formData.get("url") as string | null);
  if (!url) {
    redirect(`/admin/households/${householdId}/edit?usefulError=url`);
  }

  const title = trimOptionalField(formData.get("title") as string | null, MAX_TITLE_LEN);
  const notes = trimOptionalField(formData.get("notes") as string | null, MAX_NOTES_LEN);
  const sort_order = parseSortOrder(formData.get("sort_order") as string | null);

  const household = await prisma.households.findFirst({
    where: { id: householdId },
    select: { id: true },
  });
  if (!household) {
    redirect("/admin/households?error=notfound");
  }

  await prisma.useful_links.create({
    data: {
      id: crypto.randomUUID(),
      scope: "household",
      section_id: sectionId,
      household_id: householdId,
      user_id: null,
      url: url!,
      title,
      notes,
      sort_order,
      is_active: true,
    },
  });

  revalidatePath(`/admin/households/${householdId}/edit`);
  revalidatePath("/dashboard", "layout");
  redirect(`/admin/households/${householdId}/edit?usefulSaved=1`);
}

export async function deleteHouseholdUsefulLink(formData: FormData) {
  await requireSuperAdminSession();

  const id = (formData.get("id") as string | null)?.trim();
  const householdId = (formData.get("household_id") as string | null)?.trim();
  if (!id || !householdId) {
    redirect("/admin/households?error=id");
  }

  await prisma.useful_links.deleteMany({
    where: { id, scope: "household", household_id: householdId },
  });

  revalidatePath(`/admin/households/${householdId}/edit`);
  revalidatePath("/dashboard", "layout");
  redirect(`/admin/households/${householdId}/edit?usefulSaved=1`);
}
