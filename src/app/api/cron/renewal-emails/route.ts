import { prisma } from "@/lib/auth";
import { sendClinicDigestForSubscription } from "@/lib/clinic-digest-email/send-digest";
import { isAuthorizedCronRequest } from "@/lib/digest-email/cron-auth";
import { cronUtcSlotsQualification, debugScheduleEvaluation } from "@/lib/digest-email/schedule";
import { sendRenewalDigestForSubscription } from "@/lib/renewal-email/send-digest";

export const dynamic = "force-dynamic";

type DigestRunStats = {
  checked: number;
  sent: number;
  skipped: number;
  skipReasons: Record<string, number>;
  errors: string[];
};

async function runRenewalDigests(now: Date): Promise<DigestRunStats & { scheduleDebug: unknown[] }> {
  const subs = await prisma.renewal_email_subscriptions.findMany({
    where: { is_active: true },
    include: {
      user: { select: { email: true, full_name: true } },
      household: { select: { date_display_format: true, ui_language: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const scheduleDebug: Array<ReturnType<typeof debugScheduleEvaluation> & { subscriptionId: string }> =
    [];

  for (const sub of subs) {
    const evalDebug = debugScheduleEvaluation(sub, now);
    scheduleDebug.push({ subscriptionId: sub.id, ...evalDebug });
    const decision = evalDebug.decision;
    if (!decision.send) {
      skipped += 1;
      const key = decision.reason ?? "unknown";
      skipReasons[key] = (skipReasons[key] ?? 0) + 1;
      continue;
    }

    const result = await sendRenewalDigestForSubscription(sub, now, { updateLastSentAt: true });
    if (result.ok) {
      sent += 1;
    } else {
      errors.push(`${sub.id}: ${result.reason}`);
    }
  }

  return {
    checked: subs.length,
    sent,
    skipped,
    skipReasons,
    errors,
    scheduleDebug,
  };
}

async function runClinicDigests(now: Date): Promise<DigestRunStats & { scheduleDebug: unknown[] }> {
  const subs = await prisma.clinic_digest_email_subscriptions.findMany({
    where: { is_active: true },
    include: {
      user: { select: { email: true, full_name: true } },
      household: { select: { date_display_format: true, ui_language: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];
  const skipReasons: Record<string, number> = {};
  const scheduleDebug: Array<ReturnType<typeof debugScheduleEvaluation> & { subscriptionId: string }> =
    [];

  for (const sub of subs) {
    const evalDebug = debugScheduleEvaluation(sub, now);
    scheduleDebug.push({ subscriptionId: sub.id, ...evalDebug });
    const decision = evalDebug.decision;
    if (!decision.send) {
      skipped += 1;
      const key = decision.reason ?? "unknown";
      skipReasons[key] = (skipReasons[key] ?? 0) + 1;
      continue;
    }

    const result = await sendClinicDigestForSubscription(sub, now, { updateLastSentAt: true });
    if (result.ok) {
      sent += 1;
    } else {
      errors.push(`${sub.id}: ${result.reason}`);
    }
  }

  return {
    checked: subs.length,
    sent,
    skipped,
    skipReasons,
    errors,
    scheduleDebug,
  };
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const [renewals, clinic] = await Promise.all([runRenewalDigests(now), runClinicDigests(now)]);

  const renewalFirst = await prisma.renewal_email_subscriptions.findFirst({
    where: { is_active: true },
    select: { frequency: true, send_hour: true, timezone: true, day_of_week: true },
  });
  const cronSlotPreview =
    renewalFirst?.frequency === "weekly" && renewalFirst.day_of_week != null
      ? cronUtcSlotsQualification(
          renewalFirst.send_hour,
          renewalFirst.timezone,
          renewalFirst.day_of_week,
          now,
        )
      : null;

  return Response.json({
    ok: true,
    nowUtc: now.toISOString(),
    renewals,
    clinic,
    cronSlotPreview,
    note: "Processes renewal and clinic digest subscriptions in one invocation. UTC crons: 05, 11, 17, 23.",
  });
}
