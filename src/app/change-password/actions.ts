"use server";

import { getAuthSession, getCurrentUiLanguage, prisma } from "@/lib/auth";
import { validatePassword } from "@/lib/password-policy";
import bcrypt from "bcryptjs";

/** Avoid `redirect()` in the action so the client performs navigation (reliable with App Router + server actions). */
export type ChangePasswordActionState =
  | { error: string }
  | { redirectTo: string };

export async function changePasswordAction(
  _prev: ChangePasswordActionState | null,
  formData: FormData,
): Promise<ChangePasswordActionState> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return { redirectTo: "/login" };
  }

  const lang = await getCurrentUiLanguage();
  const he = lang === "he";

  const currentPassword = (formData.get("current_password") as string | null) ?? "";
  const newPassword = (formData.get("new_password") as string | null) ?? "";
  const confirmPassword = (formData.get("confirm_password") as string | null) ?? "";

  if (!currentPassword.trim() || !newPassword || !confirmPassword) {
    return { error: he ? "כל השדות נדרשים." : "All fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return {
      error: he
        ? "הסיסמה החדשה והאימות אינם תואמים."
        : "New password and confirmation do not match.",
    };
  }

  if (currentPassword === newPassword) {
    return {
      error: he
        ? "הסיסמה החדשה חייבת להיות שונה מהסיסמה הנוכחית."
        : "New password must be different from your current password.",
    };
  }

  const pwCheck = validatePassword(newPassword, lang);
  if (!pwCheck.ok) {
    return { error: pwCheck.errors[0] ?? (he ? "סיסמה לא תקינה." : "Invalid password.") };
  }

  const userId = session.user.id;
  const now = new Date();

  if (session.user.isSuperAdmin) {
    const row = await prisma.super_admins.findUnique({
      where: { id: userId },
    });
    if (!row) {
      return { error: he ? "החשבון לא נמצא." : "Account not found." };
    }
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) {
      return { error: he ? "הסיסמה הנוכחית שגויה." : "Current password is incorrect." };
    }
    const password_hash = await bcrypt.hash(newPassword, 12);
    await prisma.super_admins.update({
      where: { id: userId },
      data: {
        password_hash,
        must_change_password: false,
        password_changed_at: now,
      },
    });
  } else {
    const row = await prisma.users.findUnique({
      where: { id: userId },
    });
    if (!row) {
      return { error: he ? "החשבון לא נמצא." : "Account not found." };
    }
    const valid = await bcrypt.compare(currentPassword, row.password_hash);
    if (!valid) {
      return { error: he ? "הסיסמה הנוכחית שגויה." : "Current password is incorrect." };
    }
    const password_hash = await bcrypt.hash(newPassword, 12);
    await prisma.users.update({
      where: { id: userId },
      data: {
        password_hash,
        must_change_password: false,
        password_changed_at: now,
      },
    });
  }

  const homeWithNotice = encodeURIComponent("/?passwordUpdated=1");
  return { redirectTo: `/api/auth/sync-session?callbackUrl=${homeWithNotice}` };
}
