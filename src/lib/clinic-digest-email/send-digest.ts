import { prisma } from "@/lib/auth";
import { getEmailProvider, isMissingEmailConfigError } from "@/lib/email/provider";
import { getAppBaseUrl } from "@/lib/email/app-base-url";
import { renderClinicDigestEmail } from "@/lib/email/render-clinic-digest-email";
import { normalizeHouseholdDateDisplayFormat } from "@/lib/household-date-format";
import {
  privateClinicAppointments,
  privateClinicClients,
  privateClinicCommon,
  privateClinicSettings,
  privateClinicUpcomingVisits,
} from "@/lib/private-clinic-i18n";
import {
  computeClinicDigestData,
  digestItemCount,
  resolveFamilyMemberIdForUser,
} from "@/lib/private-clinic/compute-clinic-digest";
import { normalizeUiLanguage } from "@/lib/ui-language";
import type { Prisma } from "@/generated/prisma/client";

export type ClinicDigestSubscriptionWithRelations =
  Prisma.clinic_digest_email_subscriptionsGetPayload<{
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

function resolveRecipientEmail(sub: ClinicDigestSubscriptionWithRelations): string {
  const override = sub.recipient_email?.trim();
  if (override) return override;
  return sub.user.email.trim();
}

function buildEmailCopy(lang: ReturnType<typeof normalizeUiLanguage>) {
  const language = lang === "he" ? "he" : "en";
  const uiLang = lang === "he" ? "he" : "en";
  const st = privateClinicSettings(uiLang);
  const uv = privateClinicUpcomingVisits(uiLang);
  const ap = privateClinicAppointments(uiLang);
  const c = privateClinicCommon(uiLang);
  const cl = privateClinicClients(uiLang);
  return {
    language: language as "en" | "he",
    copy: {
      intro: st.digestIntro,
      sectionAppointments: st.digestSectionAppointments,
      sectionVisits: uv.pageTitle,
      sectionNeedsFirstVisit: uv.sectionNeedsFirstVisit,
      sectionNeedsFirstVisitHint: uv.sectionNeedsFirstVisitHint,
      colStart: ap.startCol,
      colClient: c.client,
      colJob: c.job,
      colVisitType: ap.visitTypeCol,
      colNextDue: uv.colNextDue,
      colLastVisit: uv.colLastVisit,
      colProgram: uv.colProgram,
      overdue: uv.overdue,
      dueToday: uv.dueToday,
      scheduledOn: uv.scheduledOn,
      noneAppointments: st.digestNoneAppointments,
      noneVisits: st.digestNoneVisits,
      allClear: st.digestAllClear,
      openAppointments: st.digestOpenAppointments,
      openUpcomingVisits: st.digestOpenUpcomingVisits,
    },
    kupatLabels: {
      none: c.none,
      clalit: cl.kupatClalit,
      maccabi: cl.kupatMaccabi,
      meuhedet: cl.kupatMeuhedet,
      leumit: cl.kupatLeumit,
    },
    noneLabel: c.none,
  };
}

export async function sendClinicDigestForSubscription(
  sub: ClinicDigestSubscriptionWithRelations,
  now: Date,
  options: { updateLastSentAt: boolean; isTest?: boolean },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const recipient = resolveRecipientEmail(sub);
  const tz = sub.timezone || "Asia/Jerusalem";
  const lang = await resolveUiLanguage(sub.user_id, sub.household_id);
  const { language, copy, kupatLabels, noneLabel } = buildEmailCopy(lang);
  const dateDisplayFormat = await resolveDateDisplayFormat(sub.user_id, sub.household_id);
  const familyMemberId = await resolveFamilyMemberIdForUser(sub.user_id, sub.household_id);

  const data = await computeClinicDigestData({
    householdId: sub.household_id,
    familyMemberId,
    now,
    daysAhead: sub.days_ahead,
    timezone: tz,
    kupatLabels,
    noneLabel,
  });

  const itemCount = digestItemCount(data);
  const baseUrl = getAppBaseUrl();
  const { subject, html, text } = renderClinicDigestEmail({
    data,
    dateDisplayFormat,
    language,
    baseUrl,
    daysAhead: sub.days_ahead,
    copy,
  });

  const isTest = options.isTest === true;

  let providerId: string | undefined;
  try {
    const provider = getEmailProvider();
    const sent = await provider.send({ to: recipient, subject, html, text });
    providerId = sent.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = isMissingEmailConfigError(e) ? "skipped" : "failed";
    await prisma.clinic_digest_email_deliveries.create({
      data: {
        subscription_id: sub.id,
        recipient_email: recipient,
        item_count: itemCount,
        status,
        error_message: msg.slice(0, 2000),
        provider_msg_id: null,
        is_test: isTest,
      },
    });
    return { ok: false, reason: msg };
  }

  await prisma.clinic_digest_email_deliveries.create({
    data: {
      subscription_id: sub.id,
      recipient_email: recipient,
      item_count: itemCount,
      status: "sent",
      error_message: null,
      provider_msg_id: providerId ?? null,
      is_test: isTest,
    },
  });

  if (options.updateLastSentAt) {
    await prisma.clinic_digest_email_subscriptions.update({
      where: { id: sub.id },
      data: { last_sent_at: now },
    });
  }

  return { ok: true };
}
