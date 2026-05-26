import { prisma } from "@/lib/auth";
import { isAuthorizedRenewalCronRequest } from "@/lib/renewal-email/cron-auth";
import { explainShouldSendNow } from "@/lib/renewal-email/schedule";
import { sendRenewalDigestForSubscription } from "@/lib/renewal-email/send-digest";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorizedRenewalCronRequest(req)) {
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

  for (const sub of subs) {
    const decision = explainShouldSendNow(sub, now);
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

  return Response.json({
    ok: true,
    checked: subs.length,
    sent,
    skipped,
    skipReasons,
    errors,
  });
}
