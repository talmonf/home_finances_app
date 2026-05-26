import { formatHouseholdDate } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { dateOnlyLocal, RENEWAL_CATEGORY_ORDER, type RenewalRow } from "@/lib/upcoming-renewals/compute";
import { overdueLabelForCategory } from "@/lib/upcoming-renewals/overdue-labels";

export type RenderRenewalsEmailParams = {
  rows: RenewalRow[];
  dateDisplayFormat: HouseholdDateDisplayFormat;
  language: "en" | "he";
  baseUrl: string;
  daysAhead: number;
  today: Date;
};

function daysFromToday(renewalDate: Date, today: Date): number {
  const a = dateOnlyLocal(renewalDate).getTime();
  const b = today.getTime();
  return Math.round((a - b) / 86400000);
}

function sortCategories(cats: string[]): string[] {
  const order = [...RENEWAL_CATEGORY_ORDER] as string[];
  return [...cats].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

export function getAppBaseUrl(): string {
  const fromAuth = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (fromAuth) return fromAuth;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;
  return "http://localhost:3000";
}

export function renderRenewalsEmail(params: RenderRenewalsEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { rows, dateDisplayFormat, language, baseUrl, daysAhead, today } = params;
  const he = language === "he";
  const dir = he ? "rtl" : "ltr";
  const align = he ? "right" : "left";

  const subject = he
    ? `חידושים, ימי הולדת ויום נישואין (${rows.length})`
    : `Upcoming renewals, birthdays & anniversaries (${rows.length})`;

  const intro = he
    ? `להלן חידושים ומועדים, ימי הולדת ויום נישואין בטווח של ${daysAhead} הימים הקרובים (כולל היום), ומנויים שנתיים/משימות/תרומות עם מועד שעבר. תאריכים עבריים מוצגים לפי המופע הלועזי הקרוב בשנה הנוכחית.`
    : `The following renewals and deadlines, birthdays, and anniversaries fall within the next ${daysAhead} days (including today), plus overdue annual subscriptions, open tasks, and donations with a past due date. Hebrew calendar dates are shown by their nearest Gregorian occurrence this year.`;

  const openDashboard = he ? "פתח את לוח המועדים הקרובים" : "Open upcoming items dashboard";
  const dashboardUrl = `${baseUrl}/dashboard/upcoming-renewals`;
  const emptyMsg = he
    ? "אין פריטים בטווח שנבחר — הכול נקי לעת עתה."
    : "No items fall in the selected window — all clear for now.";

  if (rows.length === 0) {
    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:${align};direction:${dir};">
<p>${escapeHtml(intro)}</p>
<p><strong>${escapeHtml(emptyMsg)}</strong></p>
<p><a href="${escapeAttr(dashboardUrl)}">${escapeHtml(openDashboard)}</a></p>
</body></html>`;
    const text = `${intro}\n\n${emptyMsg}\n\n${openDashboard}: ${dashboardUrl}\n`;
    return { subject, html, text };
  }

  const byCat = new Map<string, RenewalRow[]>();
  for (const r of rows) {
    const list = byCat.get(r.category) ?? [];
    list.push(r);
    byCat.set(r.category, list);
  }
  const categories = sortCategories([...byCat.keys()]);

  const timingLabel = (n: number, category: string) => {
    if (n < 0) {
      const daysAgo = Math.abs(n);
      const overdue = overdueLabelForCategory(category, he);
      return he
        ? `${overdue} · לפני ${daysAgo} ימים`
        : `${overdue} · ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
    }
    if (n === 0) {
      return he ? "היום" : "Today";
    }
    return he ? `בעוד ${n} ימים` : `In ${n} day${n === 1 ? "" : "s"}`;
  };

  let textBody = `${intro}\n\n`;
  const htmlSections: string[] = [`<p>${escapeHtml(intro)}</p>`];

  for (const cat of categories) {
    const list = byCat.get(cat) ?? [];
    htmlSections.push(
      `<h2 style="font-size:16px;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px;">${escapeHtml(cat)}</h2><ul style="margin:0;padding-${he ? "right" : "left"}:20px;">`,
    );
    textBody += `${cat}\n`;
    for (const r of list) {
      const dateStr = formatHouseholdDate(r.renewalDate, dateDisplayFormat);
      const n = daysFromToday(r.renewalDate, today);
      const timing = timingLabel(n, r.category);
      const line = `${dateStr} · ${r.renewalType} · ${r.itemName} · ${r.owner} (${timing})`;
      textBody += `  - ${line}\n`;
      const timingStyle = n < 0 ? "color:#b91c1c;" : "";
      htmlSections.push(
        `<li style="margin:6px 0;"><strong>${escapeHtml(dateStr)}</strong> · ${escapeHtml(r.renewalType)} · ${escapeHtml(r.itemName)} · <span style="color:#555;">${escapeHtml(r.owner)}</span> <em style="${timingStyle}">(${escapeHtml(timing)})</em></li>`,
      );
    }
    htmlSections.push(`</ul>`);
    textBody += "\n";
  }

  htmlSections.push(
    `<p style="margin-top:24px;"><a href="${escapeAttr(dashboardUrl)}" style="color:#0369a1;">${escapeHtml(openDashboard)}</a></p>`,
  );
  textBody += `${openDashboard}: ${dashboardUrl}\n`;

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:${align};direction:${dir};color:#111;">
${htmlSections.join("")}
</body></html>`;

  return { subject, html, text: textBody };
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
