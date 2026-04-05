"use server";

import { getAuthSession, prisma, requireHouseholdAdmin } from "@/lib/auth";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { revalidatePath } from "next/cache";

export async function updateHouseholdDateDisplayFormat(formData: FormData) {
  await requireHouseholdAdmin();
  const session = await getAuthSession();
  const householdId = session?.user?.householdId;
  if (!householdId || session.user.isSuperAdmin) return;

  const raw = (formData.get("date_display_format") as string | null)?.trim();
  const date_display_format = normalizeHouseholdDateDisplayFormat(raw);

  await prisma.households.update({
    where: { id: householdId },
    data: { date_display_format },
  });

  revalidatePath("/");
  revalidatePath("/dashboard/household-settings");
  revalidatePath("/dashboard", "layout");
}
