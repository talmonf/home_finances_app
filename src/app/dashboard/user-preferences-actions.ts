"use server";

import { prisma, requireHouseholdMember, getAuthSession } from "@/lib/auth";
import { normalizeUiLanguage } from "@/lib/ui-language";
import { revalidatePath } from "next/cache";

export async function setMyUiLanguage(formData: FormData) {
  await requireHouseholdMember();
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) return;

  const raw = (formData.get("ui_language") as string | null)?.trim();
  const ui_language = normalizeUiLanguage(raw ?? "en");

  await prisma.users.update({
    where: { id: session.user.id },
    data: { ui_language },
  });

  revalidatePath("/", "layout");
}
