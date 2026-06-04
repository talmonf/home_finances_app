import {
  formatHouseholdDate,
  formatHouseholdDateUtcWithTime,
} from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import type { ClinicDigestData } from "@/lib/private-clinic/compute-clinic-digest";
import { therapyVisitTypeLabel } from "@/lib/ui-labels";
import type { UiLanguage } from "@/lib/ui-language";
export type RenderClinicDigestEmailParams = {
  data: ClinicDigestData;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  language: "en" | "he";
  baseUrl: string;
  daysAhead: number;
  copy: {
    sectionAppointments: string;
    sectionVisits: string;
    sectionNeedsFirstVisit: string;
    sectionNeedsFirstVisitHint: string;
    colStart: string;
    colClient: string;
    colJob: string;
    colVisitType: string;
    colNextDue: string;
    colLastVisit: string;
    colProgram: string;
    overdue: string;
    dueToday: string;
    scheduledOn: (dateText: string) => string;
    noneAppointments: string;
    noneVisits: string;
    allClear: string;
    openAppointments: string;
    openUpcomingVisits: string;
  };
};

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

export function renderClinicDigestEmail(params: RenderClinicDigestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { data, dateDisplayFormat, language, baseUrl, daysAhead, copy } = params;
  const he = language === "he";
  const dir = he ? "rtl" : "ltr";
  const align = he ? "right" : "left";
  const uiLang: UiLanguage = he ? "he" : "en";

  const apptCount = data.appointments.length;
  const visitCount = data.visits.length + data.needsFirstVisit.length;
  const subject = he
    ? `מרפאה: ${apptCount} תורים, ${visitCount} ביקורים קרובים`
    : `Clinic: ${apptCount} appointments, ${visitCount} upcoming visits`;

  const appointmentsUrl = `${baseUrl}/dashboard/private-clinic/appointments`;
  const visitsUrl = `${baseUrl}/dashboard/private-clinic/upcoming-visits`;

  const totalItems = apptCount + data.visits.length + data.needsFirstVisit.length;
  if (totalItems === 0) {
    const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:${align};direction:${dir};">
<p><strong>${escapeHtml(copy.allClear)}</strong></p>
<p><a href="${escapeAttr(appointmentsUrl)}">${escapeHtml(copy.openAppointments)}</a> · <a href="${escapeAttr(visitsUrl)}">${escapeHtml(copy.openUpcomingVisits)}</a></p>
</body></html>`;
    const text = `${copy.allClear}\n\n${copy.openAppointments}: ${appointmentsUrl}\n${copy.openUpcomingVisits}: ${visitsUrl}\n`;
    return { subject, html, text };
  }

  let textBody = "";
  const htmlParts: string[] = [];
  htmlParts.push(
    `<p style="font-size:13px;color:#555;">${escapeHtml(he ? `תורים בטווח ${daysAhead} הימים הקרובים.` : `Appointments within the next ${daysAhead} days.`)}</p>`,
  );

  htmlParts.push(
    `<h2 style="font-size:16px;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px;">${escapeHtml(copy.sectionAppointments)}</h2>`,
  );
  textBody += `${copy.sectionAppointments}\n`;
  if (data.appointments.length === 0) {
    htmlParts.push(`<p>${escapeHtml(copy.noneAppointments)}</p>`);
    textBody += `  ${copy.noneAppointments}\n`;
  } else {
    htmlParts.push(`<ul style="margin:0;padding-${he ? "right" : "left"}:20px;">`);
    for (const a of data.appointments) {
      const when = formatHouseholdDateUtcWithTime(a.startAt, dateDisplayFormat);
      const visitType = therapyVisitTypeLabel(uiLang, a.visitType);
      const line = `${when} · ${a.clientName} · ${a.jobLabel} · ${visitType}`;
      textBody += `  - ${line}\n`;
      htmlParts.push(
        `<li style="margin:6px 0;"><strong>${escapeHtml(when)}</strong> · ${escapeHtml(a.clientName)} · ${escapeHtml(a.jobLabel)} · ${escapeHtml(visitType)}</li>`,
      );
    }
    htmlParts.push(`</ul>`);
  }
  textBody += "\n";

  htmlParts.push(
    `<h2 style="font-size:16px;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px;">${escapeHtml(copy.sectionVisits)}</h2>`,
  );
  textBody += `${copy.sectionVisits}\n`;
  if (data.visits.length === 0 && data.needsFirstVisit.length === 0) {
    htmlParts.push(`<p>${escapeHtml(copy.noneVisits)}</p>`);
    textBody += `  ${copy.noneVisits}\n`;
  } else {
    htmlParts.push(`<ul style="margin:0;padding-${he ? "right" : "left"}:20px;">`);
    for (const v of data.visits) {
      const dueStr = formatHouseholdDate(v.nextDue, dateDisplayFormat);
      const lastStr = formatHouseholdDate(v.lastVisit, dateDisplayFormat);
      const badge = v.isOverdue ? copy.overdue : v.isDueToday ? copy.dueToday : "";
      const apptStr = v.nextAppointment
        ? copy.scheduledOn(formatHouseholdDateUtcWithTime(v.nextAppointment.startAt, dateDisplayFormat))
        : "";
      const line = `${dueStr}${badge ? ` (${badge})` : ""} · ${v.name} · ${v.jobLabel} · ${v.programLabel}${apptStr ? ` · ${apptStr}` : ""} · ${he ? "אחרון" : "Last"}: ${lastStr}`;
      textBody += `  - ${line}\n`;
      const badgeHtml = badge
        ? ` <span style="color:${v.isOverdue ? "#b91c1c" : "#b45309"};">(${escapeHtml(badge)})</span>`
        : "";
      htmlParts.push(
        `<li style="margin:6px 0;"><strong>${escapeHtml(dueStr)}</strong>${badgeHtml} · ${escapeHtml(v.name)} · ${escapeHtml(v.jobLabel)} · ${escapeHtml(v.programLabel)}${apptStr ? ` · <em>${escapeHtml(apptStr)}</em>` : ""} · ${escapeHtml(he ? "אחרון" : "Last")}: ${escapeHtml(lastStr)}</li>`,
      );
    }
    htmlParts.push(`</ul>`);
  }

  if (data.needsFirstVisit.length > 0) {
    htmlParts.push(
      `<h3 style="font-size:14px;margin:16px 0 6px;">${escapeHtml(copy.sectionNeedsFirstVisit)}</h3>`,
      `<p style="font-size:12px;color:#555;">${escapeHtml(copy.sectionNeedsFirstVisitHint)}</p>`,
      `<ul style="margin:0;padding-${he ? "right" : "left"}:20px;">`,
    );
    textBody += `\n${copy.sectionNeedsFirstVisit}\n`;
    for (const row of data.needsFirstVisit) {
      const apptStr = row.nextAppointment
        ? copy.scheduledOn(formatHouseholdDateUtcWithTime(row.nextAppointment.startAt, dateDisplayFormat))
        : "";
      const line = `${row.name}${apptStr ? ` · ${apptStr}` : ""}`;
      textBody += `  - ${line}\n`;
      htmlParts.push(
        `<li style="margin:4px 0;">${escapeHtml(row.name)}${apptStr ? ` · <em>${escapeHtml(apptStr)}</em>` : ""}</li>`,
      );
    }
    htmlParts.push(`</ul>`);
  }

  textBody += "\n";
  htmlParts.push(
    `<p style="margin-top:24px;"><a href="${escapeAttr(appointmentsUrl)}" style="color:#0369a1;">${escapeHtml(copy.openAppointments)}</a> · <a href="${escapeAttr(visitsUrl)}" style="color:#0369a1;">${escapeHtml(copy.openUpcomingVisits)}</a></p>`,
  );
  textBody += `${copy.openAppointments}: ${appointmentsUrl}\n${copy.openUpcomingVisits}: ${visitsUrl}\n`;

  const html = `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"></head><body style="font-family:system-ui,sans-serif;margin:16px;text-align:${align};direction:${dir};color:#111;">
${htmlParts.join("")}
</body></html>`;

  return { subject, html, text: textBody };
}
