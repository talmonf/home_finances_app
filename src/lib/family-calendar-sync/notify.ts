export const FAMILY_CALENDAR_FAILURE_EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function shouldSendFamilyCalendarFailureEmail(params: {
  hasFailures: boolean;
  lastNotifiedAt: Date | null;
  now: Date;
}): boolean {
  if (!params.hasFailures) return false;
  if (!params.lastNotifiedAt) return true;
  return (
    params.now.getTime() - params.lastNotifiedAt.getTime() >= FAMILY_CALENDAR_FAILURE_EMAIL_COOLDOWN_MS
  );
}

export type FamilyCalendarFailureItem = {
  summary: string;
  error: string;
};

export function renderFamilyCalendarFailureEmail(params: {
  language: "en" | "he";
  items: FamilyCalendarFailureItem[];
  settingsUrl: string;
  reason?: "invalid_grant" | "items";
}): { subject: string; html: string; text: string } {
  const he = params.language === "he";
  const dir = he ? "rtl" : "ltr";
  const align = he ? "right" : "left";
  const subject = he
    ? "לא הצלחנו להוסיף מועדים משפחתיים ליומן Google"
    : "Could not add family dates to Google Calendar";
  const reconnectRequired = params.reason === "invalid_grant";
  const intro = reconnectRequired
    ? he
      ? "הגישה ליומן Google פגה או בוטלה. זה לא תקלה בכל יום הולדת בנפרד — צריך לחבר מחדש את החשבון פעם אחת, ואז המועדים יתווספו."
      : "Google Calendar access expired or was revoked. This is not a problem with each birthday — reconnect the account once, then the dates will be added."
    : he
      ? "המערכת ניסתה להוסיף ימי הולדת, ימי נישואין או מועדים מיוחדים ליומן Google שלך, והשליחה נכשלה. לא נשלח מייל נוסף על אותן שגיאות במשך 24 שעות."
      : "The app tried to add birthdays, anniversaries, or special dates to your Google Calendar, and the sync failed. You will not get another email about the same failures for 24 hours.";
  const reconnect = he ? "חברו מחדש את Google Calendar" : "Reconnect Google Calendar";
  const itemsToShow = reconnectRequired
    ? [{ summary: he ? "חיבור Google Calendar" : "Google Calendar connection", error: params.items[0]?.error ?? "invalid_grant" }]
    : params.items;
  const itemLines = itemsToShow.map((item) => `• ${item.summary}: ${item.error}`);

  const htmlItems = itemsToShow
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.summary)}</strong>: ${escapeHtml(item.error)}</li>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:${align};direction:${dir};color:#111;">
<p>${escapeHtml(intro)}</p>
<ul>${htmlItems}</ul>
<p><a href="${escapeAttr(params.settingsUrl)}">${escapeHtml(reconnect)}</a></p>
</body></html>`;

  const text = `${intro}\n\n${itemLines.join("\n")}\n\n${reconnect}: ${params.settingsUrl}\n`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll("'", "&#39;");
}
