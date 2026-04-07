"use server";

import { getAuthSession, prisma, requireHouseholdAdmin } from "@/lib/auth";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { normalizeUiLanguage } from "@/lib/ui-language";
import { revalidatePath } from "next/cache";

export async function updateHouseholdDateDisplayFormat(formData: FormData) {
  await requireHouseholdAdmin();
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!householdId || session.user.isSuperAdmin) return;

  const raw = (formData.get("date_display_format") as string | null)?.trim();
  const date_display_format = normalizeHouseholdDateDisplayFormat(raw);
  const ui_language = normalizeUiLanguage((formData.get("ui_language") as string | null)?.trim());

  await prisma.households.update({
    where: { id: householdId },
    data: { date_display_format, ui_language },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/household-settings");
  revalidatePath("/dashboard", "layout");
}
