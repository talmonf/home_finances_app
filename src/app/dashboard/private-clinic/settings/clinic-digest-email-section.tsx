import { prisma, getAuthSession, getCurrentHouseholdDateDisplayFormat } from "@/lib/auth";
import { DigestEmailScheduleFields } from "@/components/digest-email-schedule-fields";
import { formatInstantInIsraelTime } from "@/lib/household-date-format";
import { privateClinicSettings } from "@/lib/private-clinic-i18n";
import {
  disableClinicDigestEmailSubscription,
  sendClinicDigestEmailTestNow,
  upsertClinicDigestEmailSubscription,
} from "./clinic-digest-email-actions";

type DigestSearch = {
  digest?: string;
  reason?: string;
};

export async function ClinicDigestEmailSection({
  searchParams,
  userEmail,
  uiLanguage,
}: {
  searchParams?: DigestSearch;
  userEmail: string;
  uiLanguage: "he" | "en";
}) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const isHebrew = uiLanguage === "he";
  const st = privateClinicSettings(uiLanguage);
  const dateDisplayFormat = await getCurrentHouseholdDateDisplayFormat();
  const formatSentAt = (d: Date) =>
    formatInstantInIsraelTime(d, dateDisplayFormat, { isHebrew });

  const sub = await prisma.clinic_digest_email_subscriptions.findUnique({
    where: { user_id: userId },
  });

  const recentDeliveries = sub
    ? await prisma.clinic_digest_email_deliveries.findMany({
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

  const qp = searchParams;
  const lastScheduledDelivery = recentDeliveries.find((d) => d.status === "sent" && !d.is_test);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
      <h2 className="text-lg font-medium text-slate-200">{st.digestEmailTitle}</h2>
      <p className="mt-2 text-sm text-slate-400">{st.digestIntro}</p>

      {qp?.digest === "saved" ? (
        <p className="mt-3 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {st.digestSaved}
        </p>
      ) : null}
      {qp?.digest === "disabled" ? (
        <p className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          {st.digestDisabled}
        </p>
      ) : null}
      {qp?.digest === "test-ok" ? (
        <p className="mt-3 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {st.digestTestOk}
        </p>
      ) : null}
      {qp?.digest === "test-fail" || qp?.digest === "test-error" || qp?.digest === "test-nosub" ? (
        <p className="mt-3 rounded-lg border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {qp.digest === "test-nosub"
            ? st.digestTestNoSub
            : qp.reason
              ? `${isHebrew ? "שגיאה" : "Error"}: ${qp.reason}`
              : st.digestTestFail}
        </p>
      ) : null}

      <form
        action={upsertClinicDigestEmailSubscription}
        className="mt-4 space-y-4 rounded-xl border border-slate-700/80 bg-slate-900/40 p-4"
      >
        <label className="flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={sub?.is_active ?? false}
            className="rounded"
          />
          {st.digestEnable}
        </label>

        <DigestEmailScheduleFields
          isHebrew={isHebrew}
          initialFrequency={sub?.frequency ?? "daily"}
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
            defaultValue={sub?.send_hour ?? 18}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
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
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <p className="text-xs text-slate-500">IANA, e.g. Asia/Jerusalem</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">
            {st.digestDaysAheadAppointments}
          </label>
          <input
            type="number"
            name="days_ahead"
            min={1}
            max={365}
            defaultValue={sub?.days_ahead ?? 90}
            className="w-full max-w-xs rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <p className="text-xs text-slate-500">{st.digestDaysAheadHelp}</p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">{st.digestRecipient}</label>
          <input
            type="email"
            name="recipient_email"
            placeholder={userEmail}
            defaultValue={sub?.recipient_email ?? ""}
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
          <p className="text-xs text-slate-500">{userEmail}</p>
        </div>

        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {isHebrew ? "שמור" : "Save"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <form action={sendClinicDigestEmailTestNow}>
          <button
            type="submit"
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
          >
            {st.digestSendTest}
          </button>
        </form>
        <form action={disableClinicDigestEmailSubscription}>
          <button
            type="submit"
            className="rounded-lg border border-rose-900/60 bg-rose-950/30 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-950/50"
          >
            {st.digestTurnOff}
          </button>
        </form>
      </div>

      {sub ? (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
          <h3 className="text-sm font-semibold text-slate-200">{st.digestRecentDeliveries}</h3>
          {sub.last_sent_at ? (
            <p className="text-xs text-slate-500">
              {st.digestLastScheduled} {formatSentAt(sub.last_sent_at)}
            </p>
          ) : lastScheduledDelivery ? (
            <p className="text-xs text-slate-500">
              {st.digestLastScheduled} {formatSentAt(lastScheduledDelivery.sent_at)}
            </p>
          ) : (
            <p className="text-xs text-slate-500">{st.digestNoHistory}</p>
          )}
          {recentDeliveries.length === 0 ? (
            <p className="text-sm text-slate-400">{st.digestNoHistory}</p>
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
                      <span className="text-xs font-medium text-slate-500">
                        {d.is_test ? st.digestTest : st.digestScheduled}
                      </span>
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
                    {d.recipient_email} · {d.item_count} {st.digestItems}
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
    </section>
  );
}
