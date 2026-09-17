import { isAuthorizedCronRequest } from "@/lib/digest-email/cron-auth";
import { syncAllFamilyCalendars } from "@/lib/family-calendar-sync/sync";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const result = await syncAllFamilyCalendars(now);
  return Response.json({
    ok: result.errors.length === 0,
    nowUtc: now.toISOString(),
    ...result,
    note: "Pushes household birthdays, anniversaries, and special dates to Google Calendar. UTC crons: 05, 11, 17, 23.",
  });
}
