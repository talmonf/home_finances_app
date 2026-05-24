import { prisma } from "@/lib/auth";
import { explainShouldSendNow } from "@/lib/renewal-email/schedule";
import { sendRenewalDigestForSubscription } from "@/lib/renewal-email/send-digest";

export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(req: Request): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return auth.slice(7) === secret;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
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
