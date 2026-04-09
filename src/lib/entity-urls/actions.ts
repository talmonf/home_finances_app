"use server";

import { prisma, requireHouseholdMember, getCurrentHouseholdId } from "@/lib/auth";
import {
  isAllowedEntityUrlRedirect,
  normalizeAndValidateUrl,
  parseEntityUrlEntityKind,
  parseSortOrder,
  trimOptionalField,
  MAX_NOTES_LEN,
  MAX_TITLE_LEN,
} from "@/lib/entity-urls/validate";
import { verifyEntityUrlParent } from "@/lib/entity-urls/verify-parent";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function redirectWithError(redirectTo: string, message: string) {
  const q = new URLSearchParams({ error: message });
  redirect(`${redirectTo}?${q.toString()}`);
}

export async function createEntityUrl(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const redirectToRaw = (formData.get("redirect_to") as string | null)?.trim() || "/dashboard/insurance-policies";
  const redirectPath = redirectToRaw.split("?")[0].trim();
  if (!isAllowedEntityUrlRedirect(redirectPath)) {
    redirect("/");
  }

  const entityKind = parseEntityUrlEntityKind(formData.get("entity_kind") as string | null);
  const entityId = (formData.get("entity_id") as string | null)?.trim();
  if (!entityKind || !entityId) {
    redirectWithError(redirectPath, "Invalid link target");
  }

  const url = normalizeAndValidateUrl(formData.get("url") as string | null);
  if (!url) {
    redirectWithError(redirectPath, "Enter a valid http or https URL");
  }

  const title = trimOptionalField(formData.get("title") as string | null, MAX_TITLE_LEN);
  const notes = trimOptionalField(formData.get("notes") as string | null, MAX_NOTES_LEN);
  const sort_order = parseSortOrder(formData.get("sort_order") as string | null);

  const ok = await verifyEntityUrlParent({ householdId, entityKind, entityId });
  if (!ok) {
    redirectWithError(redirectPath, "Record not found");
  }

  await prisma.entity_urls.create({
    data: {
      id: crypto.randomUUID(),
      household_id: householdId,
      entity_kind: entityKind,
      entity_id: entityId,
      url: url!,
      title,
      notes,
      sort_order,
    },
  });

  revalidatePath(redirectPath);
  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/savings-policies");
  redirect(`${redirectPath}?urls=1`);
}

export async function deleteEntityUrl(formData: FormData) {
  await requireHouseholdMember();
  const householdId = await getCurrentHouseholdId();
  if (!householdId) {
    redirect("/");
  }

  const redirectToRaw = (formData.get("redirect_to") as string | null)?.trim() || "/dashboard/insurance-policies";
  const redirectPath = redirectToRaw.split("?")[0].trim();
  if (!isAllowedEntityUrlRedirect(redirectPath)) {
    redirect("/");
  }

  const id = (formData.get("id") as string | null)?.trim();
  if (!id) {
    redirectWithError(redirectPath, "Missing link id");
  }

  const result = await prisma.entity_urls.deleteMany({
    where: { id, household_id: householdId },
  });

  if (result.count === 0) {
    redirectWithError(redirectPath, "Link not found");
  }

  revalidatePath(redirectPath);
  revalidatePath("/dashboard/insurance-policies");
  revalidatePath("/dashboard/savings-policies");
  redirect(`${redirectPath}?urls=1`);
}
