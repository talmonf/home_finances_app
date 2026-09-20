"use server";

import { prisma, requireHouseholdMember, getAuthSession } from "@/lib/auth";
import { normalizeUiLanguage } from "@/lib/ui-language";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

function normalizeGoogleGmailAddress(raw: string | null): string | null {
  const value = raw?.trim().toLowerCase() ?? "";
  if (!value) return null;
  if (!/^[^@\s]+@gmail\.com$/i.test(value)) return null;
  return value;
}

export async function updateMyGoogleCalendarSettings(formData: FormData) {
  await requireHouseholdMember();
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) return;

  const enabled = formData.get("google_calendar_enabled") === "on";
  const gmail = normalizeGoogleGmailAddress(
    (formData.get("google_gmail_address") as string | null) ?? null,
  );

  if (enabled && !gmail) {
    redirect("/dashboard/private-clinic/settings?error=google-gmail");
  }

  const currentUser = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      google_calendar_refresh_token_encrypted: true,
      google_calendar_sync_family_dates: true,
    },
  });
  if (enabled && !currentUser?.google_calendar_refresh_token_encrypted) {
    redirect("/dashboard/private-clinic/settings?error=google-not-connected");
  }

  const clearTokens = !enabled && !currentUser?.google_calendar_sync_family_dates;

  await prisma.users.update({
    where: { id: session.user.id },
    data: {
      google_calendar_enabled: enabled,
      google_gmail_address: gmail,
      ...(clearTokens
        ? {
            google_calendar_access_token_encrypted: null,
            google_calendar_refresh_token_encrypted: null,
            google_calendar_token_expires_at: null,
            google_calendar_token_scope: null,
          }
        : {}),
    },
  });

  revalidatePath("/dashboard/private-clinic/settings");
  redirect("/dashboard/private-clinic/settings?saved=google");
}

export async function updateMyFamilyCalendarSettings(formData: FormData) {
  await requireHouseholdMember();
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.householdId || session.user.isSuperAdmin) return;

  const familyDatesEnabled = formData.get("google_calendar_sync_family_dates") === "on";
  const gmail = normalizeGoogleGmailAddress(
    (formData.get("google_gmail_address") as string | null) ?? null,
  );

  if (familyDatesEnabled && !gmail) {
    redirect("/dashboard/upcoming-renewals/email-settings?error=google-gmail");
  }

  const currentUser = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: {
      google_calendar_refresh_token_encrypted: true,
      google_calendar_enabled: true,
    },
  });
  if (familyDatesEnabled && !currentUser?.google_calendar_refresh_token_encrypted) {
    redirect("/dashboard/upcoming-renewals/email-settings?error=google-not-connected");
  }

  const clearTokens = !familyDatesEnabled && !currentUser?.google_calendar_enabled;

  await prisma.users.update({
    where: { id: session.user.id },
    data: {
      google_calendar_sync_family_dates: familyDatesEnabled,
      google_gmail_address: gmail,
      ...(clearTokens
        ? {
            google_calendar_access_token_encrypted: null,
            google_calendar_refresh_token_encrypted: null,
            google_calendar_token_expires_at: null,
            google_calendar_token_scope: null,
          }
        : {}),
    },
  });

  if (familyDatesEnabled) {
    const { syncHouseholdFamilyCalendarSafe } = await import("@/lib/family-calendar-sync/sync");
    await syncHouseholdFamilyCalendarSafe(session.user.householdId);
  }

  revalidatePath("/dashboard/upcoming-renewals/email-settings");
  redirect("/dashboard/upcoming-renewals/email-settings?saved=family-calendar");
}

export async function syncMyFamilyCalendarNow() {
  await requireHouseholdMember();
  const session = await getAuthSession();
  if (!session?.user?.id || !session.user.householdId || session.user.isSuperAdmin) return;

  const { enableFamilyCalendarSyncIfGoogleConnected, syncHouseholdFamilyCalendar } = await import(
    "@/lib/family-calendar-sync/sync"
  );
  const connected = await enableFamilyCalendarSyncIfGoogleConnected(session.user.id);
  if (!connected) {
    redirect("/dashboard/upcoming-renewals/email-settings?error=google-not-connected");
  }

  const result = await syncHouseholdFamilyCalendar(session.user.householdId);
  const user = await prisma.users.findUnique({
    where: { id: session.user.id },
    select: { family_calendar_sync_error: true },
  });
  if (result.failures > 0 || user?.family_calendar_sync_error) {
    const reason = encodeURIComponent((user?.family_calendar_sync_error ?? "sync failed").slice(0, 300));
    redirect(`/dashboard/upcoming-renewals/email-settings?error=sync-failed&reason=${reason}`);
  }

  revalidatePath("/dashboard/upcoming-renewals/email-settings");
  redirect("/dashboard/upcoming-renewals/email-settings?saved=family-calendar-synced");
}
