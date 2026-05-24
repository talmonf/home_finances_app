import { prisma } from "@/lib/auth";
import { getEmailProvider, isMissingEmailConfigError } from "@/lib/email/provider";
import { getAppBaseUrl, renderRenewalsEmail } from "@/lib/email/render-renewals-email";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { normalizeUiLanguage } from "@/lib/ui-language";
import { computeUpcomingRenewals } from "@/lib/upcoming-renewals/compute";
import {
  alreadySentInDeliveryPeriod,
  startOfCalendarDayInTimeZone,
} from "@/lib/renewal-email/schedule";
import type { Prisma } from "@/generated/prisma/client";

export type RenewalSubscriptionWithRelations = Prisma.renewal_email_subscriptionsGetPayload<{
  include: {
    user: { select: { email: true; full_name: true } };
    household: { select: { date_display_format: true; ui_language: true } };
  };
}>;

async function resolveDateDisplayFormat(
  userId: string,
  householdId: string,
): Promise<ReturnType<typeof normalizeHouseholdDateDisplayFormat>> {
  const userRow = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId },
    select: { date_display_format: true },
  });
  if (userRow?.date_display_format) {
    return normalizeHouseholdDateDisplayFormat(userRow.date_display_format);
  }
  const row = await prisma.households.findUnique({
    where: { id: householdId },
    select: { date_display_format: true },
  });
  return normalizeHouseholdDateDisplayFormat(row?.date_display_format);
}

async function resolveUiLanguage(userId: string, householdId: string) {
  const userRow = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId },
    select: { ui_language: true },
  });
  if (userRow?.ui_language) {
    return normalizeUiLanguage(userRow.ui_language);
  }
  const row = await prisma.households.findUnique({
    where: { id: householdId },
    select: { ui_language: true },
  });
  return normalizeUiLanguage(row?.ui_language);
}

function resolveRecipientEmail(sub: RenewalSubscriptionWithRelations): string {
  const override = sub.recipient_email?.trim();
  if (override) return override;
  return sub.user.email.trim();
}

/**
 * Builds the renewal list, renders email, sends via provider, writes delivery row.
 * On success, updates `last_sent_at` unless `options.updateLastSentAt` is false (test sends).
 */
export async function sendRenewalDigestForSubscription(
  sub: RenewalSubscriptionWithRelations,
  now: Date,
  options: { updateLastSentAt: boolean },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const recipient = resolveRecipientEmail(sub);
  const tz = sub.timezone || "Asia/Jerusalem";
  const today = startOfCalendarDayInTimeZone(now, tz);
  const lang = await resolveUiLanguage(sub.user_id, sub.household_id);
  const language = lang === "he" ? "he" : "en";
  const dateDisplayFormat = await resolveDateDisplayFormat(sub.user_id, sub.household_id);

  const rows = await computeUpcomingRenewals({
    householdId: sub.household_id,
    today,
    daysAhead: sub.days_ahead,
    language,
  });

  const baseUrl = getAppBaseUrl();
  const { subject, html, text } = renderRenewalsEmail({
    rows,
    dateDisplayFormat,
    language,
    baseUrl,
    daysAhead: sub.days_ahead,
    today,
  });

  let providerId: string | undefined;
  try {
    const provider = getEmailProvider();
    const sent = await provider.send({ to: recipient, subject, html, text });
    providerId = sent.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = isMissingEmailConfigError(e) ? "skipped" : "failed";
    await prisma.renewal_email_deliveries.create({
      data: {
        subscription_id: sub.id,
        recipient_email: recipient,
        item_count: rows.length,
        status,
        error_message: msg.slice(0, 2000),
        provider_msg_id: null,
      },
    });
    return { ok: false, reason: msg };
  }

  await prisma.renewal_email_deliveries.create({
    data: {
      subscription_id: sub.id,
      recipient_email: recipient,
      item_count: rows.length,
      status: "sent",
      error_message: null,
      provider_msg_id: providerId ?? null,
    },
  });

  if (options.updateLastSentAt) {
    await prisma.renewal_email_subscriptions.update({
      where: { id: sub.id },
      data: { last_sent_at: now },
    });
  }

  return { ok: true };
}

export function shouldSkipDuplicateSend(
  sub: RenewalSubscriptionWithRelations,
  now: Date,
): boolean {
  return alreadySentInDeliveryPeriod(
    sub.frequency,
    sub.last_sent_at,
    now,
    sub.timezone || "Asia/Jerusalem",
  );
}
