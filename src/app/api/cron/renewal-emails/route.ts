import { prisma } from "@/lib/auth";
import { isAuthorizedRenewalCronRequest, isVercelCronInvocation } from "@/lib/renewal-email/cron-auth";
import { cronUtcSlotsQualification, debugScheduleEvaluation } from "@/lib/renewal-email/schedule";
import { sendRenewalDigestForSubscription } from "@/lib/renewal-email/send-digest";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authorized = isAuthorizedRenewalCronRequest(req);
  // #region agent log
  fetch("http://127.0.0.1:7621/ingest/adff46cd-7c3b-47a7-be95-a9a2c6036576", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fadee9" },
    body: JSON.stringify({
      sessionId: "fadee9",
      hypothesisId: "C",
      location: "renewal-emails/route.ts:GET",
      message: "cron request",
      data: {
        authorized,
        vercelCron: isVercelCronInvocation(req),
        cronSchedule: req.headers.get("x-vercel-cron-schedule"),
        userAgent: (req.headers.get("user-agent") ?? "").slice(0, 40),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
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

  const decisions: Array<{ subscriptionId: string; send: boolean; reason?: string }> = [];
  const scheduleDebug: Array<ReturnType<typeof debugScheduleEvaluation> & { subscriptionId: string }> =
    [];

  for (const sub of subs) {
    const evalDebug = debugScheduleEvaluation(sub, now);
    scheduleDebug.push({ subscriptionId: sub.id, ...evalDebug });
    const decision = evalDebug.decision;
    decisions.push({
      subscriptionId: sub.id,
      send: decision.send,
      reason: decision.reason,
    });
    if (!decision.send) {
      skipped += 1;
      const key = decision.reason ?? "unknown";
      skipReasons[key] = (skipReasons[key] ?? 0) + 1;
      continue;
    }

    // #region agent log
    fetch("http://127.0.0.1:7621/ingest/adff46cd-7c3b-47a7-be95-a9a2c6036576", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fadee9" },
      body: JSON.stringify({
        sessionId: "fadee9",
        hypothesisId: "E",
        location: "renewal-emails/route.ts:send",
        message: "attempting send",
        data: { subscriptionId: sub.id, itemCountPreview: "pending" },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const result = await sendRenewalDigestForSubscription(sub, now, { updateLastSentAt: true });
    // #region agent log
    fetch("http://127.0.0.1:7621/ingest/adff46cd-7c3b-47a7-be95-a9a2c6036576", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "fadee9" },
      body: JSON.stringify({
        sessionId: "fadee9",
        hypothesisId: "E",
        location: "renewal-emails/route.ts:sendResult",
        message: "send result",
        data: { subscriptionId: sub.id, ok: result.ok, reason: result.ok ? null : result.reason },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (result.ok) {
      sent += 1;
    } else {
      errors.push(`${sub.id}: ${result.reason}`);
    }
  }

  const first = subs[0];
  const cronSlotPreview =
    first?.frequency === "weekly" && first.day_of_week != null
      ? cronUtcSlotsQualification(first.send_hour, first.timezone, first.day_of_week, now)
      : null;

  return Response.json({
    ok: true,
    nowUtc: now.toISOString(),
    checked: subs.length,
    sent,
    skipped,
    skipReasons,
    errors,
    decisions,
    scheduleDebug,
    cronSlotPreview,
    note: "Weekly send requires local hour >= send_hour on scheduled weekday (or catch-up later in week). UTC crons: 05, 11, 17, 23 — see cronSlotPreview for Israel local hour.",
  });
}
