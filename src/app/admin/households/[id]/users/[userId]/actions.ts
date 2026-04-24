"use server";

import { getAuthSession, prisma } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { upsertUserEnabledSections } from "@/lib/household-sections";
import { normalizeUiLanguage } from "@/lib/ui-language";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const ALLOWED_USER_TYPES = [
  "family_member",
  "financial_advisor",
  "other",
] as const;

export async function updateHouseholdUser(formData: FormData) {
  const session = await getAuthSession();
  if (!session?.user?.isSuperAdmin) {
    redirect("/");
  }

  const householdId = (formData.get("household_id") as string | null)?.trim();
  const userId = (formData.get("user_id") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim();
  const fullName = (formData.get("full_name") as string | null)?.trim();
  const role = (formData.get("role") as string | null)?.trim();
  const userType = (formData.get("user_type") as string | null)?.trim();
  const rawDateDisplayFormat = (formData.get("date_display_format") as string | null)?.trim();
  const rawUiLanguage = (formData.get("ui_language") as string | null)?.trim();
  const familyMemberId = (formData.get("family_member_id") as string | null)?.trim() || null;
  const newPassword = (formData.get("new_password") as string | null)?.trim() || "";
  const mustChangePasswordRequested = formData.get("must_change_password") === "on";
  const showUsefulLinks = formData.get("show_useful_links") === "on";

  if (!householdId || !userId) {
    redirect("/admin/households?error=" + encodeURIComponent("Missing household or user."));
  }

  if (!email || !fullName || !role || !userType) {
    redirect(
      `/admin/households/${householdId}/users/${userId}?error=${encodeURIComponent("All fields are required")}`,
    );
  }

  if (role !== "admin" && role !== "member") {
    redirect(
      `/admin/households/${householdId}/users/${userId}?error=${encodeURIComponent("Invalid role")}`,
    );
  }

  if (!ALLOWED_USER_TYPES.includes(userType as (typeof ALLOWED_USER_TYPES)[number])) {
    redirect(
      `/admin/households/${householdId}/users/${userId}?error=${encodeURIComponent("Invalid user type")}`,
    );
  }

  const existing = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId },
    select: { id: true },
  });
  if (!existing) {
    redirect(`/admin/households/${householdId}?error=${encodeURIComponent("User not found")}`);
  }

  if (familyMemberId) {
    const linkedMember = await prisma.family_members.findFirst({
      where: {
        id: familyMemberId,
        household_id: householdId,
        is_active: true,
      },
      select: { id: true },
    });
    if (!linkedMember) {
      redirect(
        `/admin/households/${householdId}/users/${userId}?error=${encodeURIComponent("Invalid family member selection")}`,
      );
    }
  }

  if (newPassword) {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.ok) {
      redirect(
        `/admin/households/${householdId}/users/${userId}?error=${encodeURIComponent(pwCheck.errors[0] ?? "Invalid password.")}`,
      );
    }
  }

  const password_hash = newPassword ? await bcrypt.hash(newPassword, 12) : undefined;
  const now = new Date();
  const includesDateDisplayFormatOverride = formData.has("date_display_format");
  const includesUiLanguageOverride = formData.has("ui_language");
  const includesSectionOverrides = formData.get("user_section_overrides_present") === "1";

  const userUpdateData: {
    email: string;
    full_name: string;
    role: "admin" | "member";
    user_type: (typeof ALLOWED_USER_TYPES)[number];
    family_member_id: string | null;
    show_useful_links: boolean;
    date_display_format?: ReturnType<typeof normalizeHouseholdDateDisplayFormat> | null;
    ui_language?: ReturnType<typeof normalizeUiLanguage> | null;
    password_hash?: string;
    must_change_password: boolean;
    password_changed_at?: Date;
  } = {
    email,
    full_name: fullName,
    role,
    user_type: userType as (typeof ALLOWED_USER_TYPES)[number],
    family_member_id: familyMemberId,
    show_useful_links: showUsefulLinks,
    ...(password_hash
      ? {
          password_hash,
          must_change_password: true,
          password_changed_at: now,
        }
      : { must_change_password: mustChangePasswordRequested }),
  };

  if (includesDateDisplayFormatOverride) {
    userUpdateData.date_display_format = rawDateDisplayFormat
      ? normalizeHouseholdDateDisplayFormat(rawDateDisplayFormat)
      : null;
  }
  if (includesUiLanguageOverride) {
    userUpdateData.ui_language = rawUiLanguage ? normalizeUiLanguage(rawUiLanguage) : null;
  }

  await prisma.users.update({
    where: { id: userId },
    data: userUpdateData,
  });

  if (includesSectionOverrides) {
    const enabledBySectionId: Record<string, boolean> = {};
    for (const section of DASHBOARD_SECTIONS) {
      enabledBySectionId[section.id] = formData.get(`section_${section.id}`) === "on";
    }
    await upsertUserEnabledSections({ householdId, userId, enabledBySectionId });
  }

  revalidatePath("/");
  revalidatePath("/dashboard", "layout");
  revalidatePath(`/admin/households/${householdId}`);
  revalidatePath(`/admin/households/${householdId}/users/${userId}`);

  redirect(`/admin/households/${householdId}/users/${userId}?updated=1`);
}
