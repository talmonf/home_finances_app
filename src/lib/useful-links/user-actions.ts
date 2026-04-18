"use server";

import { getAuthSession, getCurrentShowUsefulLinks, prisma } from "@/lib/auth";
import {
  normalizeAndValidateUrl,
  parseSortOrder,
  trimOptionalField,
  MAX_NOTES_LEN,
  MAX_TITLE_LEN,
} from "@/lib/entity-urls/validate";
import { parseDashboardSectionId } from "@/lib/useful-links/parse-section-id";
import { isAllowedUsefulLinkReturnPath } from "@/lib/useful-links/return-path";
import { isDashboardSectionVisibleForMember } from "@/lib/useful-links/section-visible";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function returnPathOnly(raw: string | null | undefined): string {
  const base = raw?.trim() || "/dashboard";
  return base.split("?")[0].trim();
}

function redirectWithUsefulError(returnPath: string, message: string) {
  const path = returnPath.split("?")[0].trim();
  const q = new URLSearchParams();
  q.set("usefulError", message);
  redirect(`${path}?${q.toString()}`);
}

export async function createMyUsefulLink(formData: FormData) {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    redirect("/");
  }
  const householdId = session.user.householdId;
  const userId = session.user.id;

  if (!(await getCurrentShowUsefulLinks())) {
    redirect("/");
  }

  const returnPath = returnPathOnly(formData.get("return_path") as string | null);
  if (!isAllowedUsefulLinkReturnPath(returnPath)) {
    redirect("/");
  }

  const sectionId = parseDashboardSectionId(formData.get("section_id") as string | null);
  if (!sectionId) {
    redirectWithUsefulError(returnPath, "Invalid section");
  }

  const visible = await isDashboardSectionVisibleForMember({
    sectionId: sectionId!,
    householdId,
    userId,
  });
  if (!visible) {
    redirectWithUsefulError(returnPath, "Section is not enabled for your account");
  }

  const url = normalizeAndValidateUrl(formData.get("url") as string | null);
  if (!url) {
    redirectWithUsefulError(returnPath, "Enter a valid http or https URL");
  }

  const title = trimOptionalField(formData.get("title") as string | null, MAX_TITLE_LEN);
  const notes = trimOptionalField(formData.get("notes") as string | null, MAX_NOTES_LEN);
  const sort_order = parseSortOrder(formData.get("sort_order") as string | null);

  await prisma.useful_links.create({
    data: {
      id: crypto.randomUUID(),
      scope: "user",
      section_id: sectionId!,
      household_id: householdId,
      user_id: userId,
      url: url!,
      title,
      notes,
      sort_order,
      is_active: true,
    },
  });

  revalidatePath(returnPath.split("?")[0]);
  redirect(returnPath.split("?")[0]);
}

export async function deleteMyUsefulLink(formData: FormData) {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    redirect("/");
  }
  const householdId = session.user.householdId;
  const userId = session.user.id;

  if (!(await getCurrentShowUsefulLinks())) {
    redirect("/");
  }

  const returnPath = returnPathOnly(formData.get("return_path") as string | null);
  if (!isAllowedUsefulLinkReturnPath(returnPath)) {
    redirect("/");
  }

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    redirectWithUsefulError(returnPath, "Missing link id");
  }

  const result = await prisma.useful_links.deleteMany({
    where: {
      id,
      scope: "user",
      household_id: householdId,
      user_id: userId,
    },
  });

  if (result.count === 0) {
    redirectWithUsefulError(returnPath, "Link not found");
  }

  revalidatePath(returnPath.split("?")[0]);
  redirect(returnPath.split("?")[0]);
}
