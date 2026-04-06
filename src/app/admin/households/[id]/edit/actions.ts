"use server";

import { prisma, requireSuperAdmin } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { upsertHouseholdEnabledSections } from "@/lib/household-sections";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveHouseholdSettings(formData: FormData) {
  await requireSuperAdmin();

  const householdId = (formData.get("household_id") as string | null)?.trim();
  if (!householdId) {
    redirect("/admin/households?error=" + encodeURIComponent("Missing household."));
  }

  const raw = (formData.get("date_display_format") as string | null)?.trim();
  const date_display_format = normalizeHouseholdDateDisplayFormat(raw);

  await prisma.households.update({
    where: { id: householdId },
    data: { date_display_format },
  });

  const enabledBySectionId: Record<string, boolean> = {};
  for (const section of DASHBOARD_SECTIONS) {
    enabledBySectionId[section.id] =
      formData.get(`section_${section.id}`) === "on";
  }

  await upsertHouseholdEnabledSections({ householdId, enabledBySectionId });

  revalidatePath("/admin/households");
  revalidatePath(`/admin/households/${householdId}/edit`);
  revalidatePath("/");
  revalidatePath("/dashboard", "layout");

  redirect(`/admin/households/${householdId}/edit?saved=1`);
}
