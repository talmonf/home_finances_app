import { prisma, requireHouseholdMember, getAuthSession, getCurrentHouseholdDateDisplayFormat } from "@/lib/auth";
import { formatInstantInIsraelTime } from "@/lib/household-date-format";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  disableRenewalEmailSubscription,
  sendRenewalEmailTestNow,
  upsertRenewalEmailSubscription,
} from "./actions";
import { RenewalEmailScheduleFields } from "./renewal-email-schedule-fields";

export const dynamic = "force-dynamic";

type Search = {
  saved?: string;
  disabled?: string;
  test?: string;
  reason?: string;
};

export default async function RenewalEmailSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireHouseholdMember();
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const householdId = session?.user?.householdId;
  if (!userId || !householdId || session.user.isSuperAdmin) redirect("/");

  const qp = searchParams ? await searchParams : undefined;
  const user = await prisma.users.findFirst({
    where: { id: userId, household_id: householdId },
    select: { email: true, ui_language: true },
  });
  if (!user) redirect("/");

  const sub = await prisma.renewal_email_subscriptions.findUnique({
    where: { user_id: userId },
  });

  const recentDeliveries = sub
    ? await prisma.renewal_email_deliveries.findMany({
        where: { subscription_id: sub.id },
        orderBy: { sent_at: "desc" },
        take: 5,
        select: {
          id: true,
          sent_at: true,
          status: true,
          item_count: true,
          error_message: true,
          recipient_email: true,
          is_test: true,
        },
      })
    : [];

  const isHebrew = user.ui_language === "he";
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const formatSentAt = (d: Date) => formatInstantInIsraelTime(d, dateDisplayFormat, { isHebrew });

  const lastScheduledDelivery = recentDeliveries.find((d) => d.status === "sent" && !d.is_test);

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link
            href="/dashboard/upcoming-renewals"
            className="inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "← חזרה לחידושים" : "← Back to upcoming renewals"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            {isHebrew ? "אימייל תזכורת חידושים" : "Renewal digest email"}
          </h1>
          <p className="text-sm text-slate-400">
            {isHebrew
              ? "קבלו בריכוז את רשימת החידושים והמועדים הקרובים. כברירת מחדל נשלח לכתובת המשתמש שלכם."
              : "Receive a scheduled email with upcoming renewals and deadlines. By default messages go to your account email."}
          </p>
        </header>

        {qp?.saved ? (
          <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {isHebrew ? "ההגדרות נשמרו." : "Settings saved."}
          </p>
        ) : null}
        {qp?.disabled ? (
          <p className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
            {isHebrew ? "האימייל המתוזמן כובה." : "Scheduled digest is turned off."}
          </p>
        ) : null}
        {qp?.test === "ok" ? (
          <p className="rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {isHebrew ? "אימייל בדיקה נשלח." : "Test email sent."}
          </p>
        ) : null}
        {qp?.test === "fail" || qp?.test === "error" || qp?.test === "nosub" ? (
          <p className="rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {qp.test === "nosub"
              ? isHebrew
                ? "שמרו את ההגדרות לפני שליחת בדיקה."
                : "Save your settings before sending a test."
              : qp.reason
                ? `${isHebrew ? "שגיאה" : "Error"}: ${qp.reason}`
                : isHebrew
                  ? "שליחת הבדיקה נכשלה."
                  : "Test send failed."}
          </p>
        ) : null}
        <form action={upsertRenewalEmailSubscription} className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" name="is_active" defaultChecked={sub?.is_active ?? true} className="rounded" />
            {isHebrew ? "הפעל תזכורת אימייל מתוזמנת" : "Enable scheduled digest email"}
          </label>

          <RenewalEmailScheduleFields
            isHebrew={isHebrew}
            initialFrequency={sub?.frequency ?? "weekly"}
            initialDayOfWeek={sub?.day_of_week ?? 0}
            initialDayOfMonth={sub?.day_of_month ?? 1}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              {isHebrew ? "שעת שליחה (0–23, שעון מקומי)" : "Send hour (0–23, local time)"}
            </label>
            <input
              type="number"
              name="send_hour"
              min={0}
              max={23}
              defaultValue={sub?.send_hour ?? 7}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              {isHebrew ? "אזור זמן" : "Time zone"}
            </label>
            <input
              type="text"
              name="timezone"
              defaultValue={sub?.timezone ?? "Asia/Jerusalem"}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-xs text-slate-500">IANA, e.g. Asia/Jerusalem, Europe/London</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              {isHebrew ? "ימים קדימה (חלון)" : "Days ahead (window)"}
            </label>
            <input
              type="number"
              name="days_ahead"
              min={1}
              max={365}
              defaultValue={sub?.days_ahead ?? 30}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-xs text-slate-500">
              {isHebrew
                ? "רק פריטים עם תאריך חידוש/מועד מהיום עד כולל יום זה בעוד N ימים."
                : "Only items with renewal/deadline from today through N calendar days ahead."}
            </p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">
              {isHebrew ? "כתובת נמען (ריק = המייל של המשתמש)" : "Recipient email (blank = your user email)"}
            </label>
            <input
              type="email"
              name="recipient_email"
              placeholder={user.email}
              defaultValue={sub?.recipient_email ?? ""}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              {isHebrew ? "שמור" : "Save"}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <form action={sendRenewalEmailTestNow}>
            <button
              type="submit"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
            >
              {isHebrew ? "שלח אימייל בדיקה עכשיו" : "Send test email now"}
            </button>
          </form>
          <form action={disableRenewalEmailSubscription}>
            <button
              type="submit"
              className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/50"
            >
              {isHebrew ? "כבה תזכורות" : "Turn off digest"}
            </button>
          </form>
        </div>

        {sub ? (
          <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-200">
              {isHebrew ? "שליחות אחרונות" : "Recent deliveries"}
            </h2>
            {sub.last_sent_at ? (
              <p className="text-xs text-slate-500">
                {isHebrew ? "שליחה מתוזמנת אחרונה:" : "Last scheduled send:"}{" "}
                {formatSentAt(sub.last_sent_at)}
              </p>
            ) : lastScheduledDelivery ? (
              <p className="text-xs text-slate-500">
                {isHebrew
                  ? "טרם נרשמה שליחה מתוזמנת במערכת; השליחה המתוזמנת האחרונה בהיסטוריה:"
                  : "No scheduled send timestamp stored yet; last scheduled delivery in history:"}{" "}
                {formatSentAt(lastScheduledDelivery.sent_at)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {isHebrew
                  ? "טרם נשלח אימייל מתוזמן. שליחות בדיקה מסומנות למטה."
                  : "No scheduled send yet. Test sends are labeled below."}
              </p>
            )}
            {recentDeliveries.length === 0 ? (
              <p className="text-sm text-slate-400">
                {isHebrew ? "אין היסטוריית שליחה." : "No delivery history yet."}
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentDeliveries.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-300">{formatSentAt(d.sent_at)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {d.is_test ? (
                          <span className="text-xs font-medium text-sky-400/90">
                            {isHebrew ? "בדיקה" : "Test"}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-500">
                            {isHebrew ? "מתוזמן" : "Scheduled"}
                          </span>
                        )}
                        <span
                          className={
                            d.status === "sent"
                              ? "text-emerald-400"
                              : d.status === "skipped"
                                ? "text-amber-400"
                                : "text-rose-400"
                          }
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {d.recipient_email} · {d.item_count} {isHebrew ? "פריטים" : "items"}
                    </p>
                    {d.error_message ? (
                      <p className="mt-1 text-xs text-rose-300/90">{d.error_message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
