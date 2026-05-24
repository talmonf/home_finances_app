"use server";

import { prisma, requireHouseholdMember, getAuthSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { RenewalEmailFrequency } from "@/generated/prisma/client";
import { sendRenewalDigestForSubscription } from "@/lib/renewal-email/send-digest";

const FREQ: RenewalEmailFrequency[] = ["daily", "weekly", "monthly"];

function parseBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

function parseEmailOrNull(raw: string | null): string | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null;
  return t;
}

export async function upsertRenewalEmailSubscription(formData: FormData) {
  await requireHouseholdMember();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId;
  if (!userId || !householdId || session.user.isSuperAdmin) return;

  const is_active = parseBool(formData.get("is_active"));
  const rawFreq = (formData.get("frequency") as string | null)?.trim() ?? "weekly";
  const frequency = (FREQ.includes(rawFreq as RenewalEmailFrequency) ? rawFreq : "weekly") as RenewalEmailFrequency;
  const send_hour = Math.min(23, Math.max(0, Number(formData.get("send_hour")) || 7));
  const days_ahead = Math.min(365, Math.max(1, Number(formData.get("days_ahead")) || 30));
  const day_of_week = Math.min(6, Math.max(0, Number(formData.get("day_of_week")) || 0));
  const day_of_month = Math.min(31, Math.max(1, Number(formData.get("day_of_month")) || 1));
  const timezone = ((formData.get("timezone") as string | null)?.trim() || "Asia/Jerusalem").slice(0, 64);
  const recipient_email = parseEmailOrNull((formData.get("recipient_email") as string | null) ?? null);

  let dayOfWeek: number | null = null;
  let dayOfMonth: number | null = null;
  if (frequency === "weekly") {
    dayOfWeek = day_of_week;
  } else if (frequency === "monthly") {
    dayOfMonth = day_of_month;
  }

  await prisma.renewal_email_subscriptions.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      household_id: householdId,
      is_active,
      recipient_email,
      frequency,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      send_hour,
      timezone,
      days_ahead,
    },
    update: {
      household_id: householdId,
      is_active,
      recipient_email,
      frequency,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      send_hour,
      timezone,
      days_ahead,
    },
  });

  revalidatePath("/dashboard/upcoming-renewals/email-settings");
  redirect("/dashboard/upcoming-renewals/email-settings?saved=1");
}

export async function disableRenewalEmailSubscription() {
  await requireHouseholdMember();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId || session.user.isSuperAdmin) return;

  await prisma.renewal_email_subscriptions.updateMany({
    where: { user_id: userId },
    data: { is_active: false },
  });
  revalidatePath("/dashboard/upcoming-renewals/email-settings");
  redirect("/dashboard/upcoming-renewals/email-settings?disabled=1");
}

export async function sendRenewalEmailTestNow() {
  await requireHouseholdMember();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId;
  if (!userId || !householdId || session.user.isSuperAdmin) {
    redirect("/dashboard/upcoming-renewals/email-settings?test=error");
  }

  const sub = await prisma.renewal_email_subscriptions.findUnique({
    where: { user_id: userId },
    include: {
      user: { select: { email: true, full_name: true } },
      household: { select: { date_display_format: true, ui_language: true } },
    },
  });

  if (!sub) {
    redirect("/dashboard/upcoming-renewals/email-settings?test=nosub");
  }

  const result = await sendRenewalDigestForSubscription(sub, new Date(), {
    updateLastSentAt: false,
    isTest: true,
  });
  if (!result.ok) {
    redirect(
      `/dashboard/upcoming-renewals/email-settings?test=fail&reason=${encodeURIComponent(result.reason.slice(0, 500))}`,
    );
  }
  redirect("/dashboard/upcoming-renewals/email-settings?test=ok");
}
