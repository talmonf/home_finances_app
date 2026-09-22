import { prisma } from "@/lib/auth";
import {
  HEBREW_EVENING_END_HOUR,
  HEBREW_EVENING_START_HOUR,
} from "@/lib/family-calendar-sync/keys";
import {
  decryptGoogleToken,
  getGoogleOAuthClient,
  persistRefreshedGoogleTokens,
} from "@/lib/google-calendar/oauth";
import { google } from "googleapis";

const APPOINTMENT_TIME_ZONE = "Asia/Jerusalem";

export type GoogleCalendarUserConfig = {
  id: string;
  household_id: string;
  google_calendar_enabled: boolean;
  google_gmail_address: string | null;
  google_calendar_access_token_encrypted: string | null;
  google_calendar_refresh_token_encrypted: string | null;
  google_calendar_token_expires_at: Date | null;
};

export function isGmailAddress(value: string): boolean {
  return /^[^@\s]+@gmail\.com$/i.test(value.trim());
}

function assertGoogleUserReady(user: GoogleCalendarUserConfig): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = decryptGoogleToken(user.google_calendar_access_token_encrypted);
  const refreshToken = decryptGoogleToken(user.google_calendar_refresh_token_encrypted);
  if (!accessToken || !refreshToken) throw new Error("Google Calendar account is not connected");
  return { accessToken, refreshToken };
}

function isGoogleNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === 404 || code === 410;
}

const FAMILY_DATE_REMINDERS = {
  useDefault: false,
  overrides: [
    { method: "popup" as const, minutes: 24 * 60 },
    { method: "email" as const, minutes: 24 * 60 },
  ],
};

function addOneIsoCalendarDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(year, (month ?? 1) - 1, (day ?? 1) + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getCalendarClientForUser(user: GoogleCalendarUserConfig) {
  const { accessToken, refreshToken } = assertGoogleUserReady(user);
  const auth = getGoogleOAuthClient();
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: user.google_calendar_token_expires_at?.getTime() ?? undefined,
  });
  auth.on("tokens", (tokens) => {
    void persistRefreshedGoogleTokens(user.id, tokens);
  });
  const expiresAt = user.google_calendar_token_expires_at?.getTime() ?? 0;
  if (expiresAt < Date.now() + 60_000) {
    await auth.getAccessToken();
  }
  return google.calendar({ version: "v3", auth });
}

export async function pingGoogleCalendarAccess(user: GoogleCalendarUserConfig): Promise<void> {
  await getCalendarClientForUser(user);
}

export async function upsertGoogleCalendarEvent(params: {
  user: GoogleCalendarUserConfig;
  existingEventId: string | null;
  summary: string;
  description: string;
  startIsoUtc: string;
  endIsoUtc: string;
}) {
  const calendar = await getCalendarClientForUser(params.user);
  const eventBody = {
    summary: params.summary,
    description: params.description,
    start: { dateTime: params.startIsoUtc, timeZone: APPOINTMENT_TIME_ZONE },
    end: { dateTime: params.endIsoUtc, timeZone: APPOINTMENT_TIME_ZONE },
  };

  if (params.existingEventId) {
    const updated = await calendar.events.update({
      calendarId: "primary",
      eventId: params.existingEventId,
      requestBody: eventBody,
      sendUpdates: "all",
    });
    return updated.data.id ?? params.existingEventId;
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
    sendUpdates: "all",
  });
  if (!created.data.id) throw new Error("Google Calendar event id missing after create");
  return created.data.id;
}

export async function deleteGoogleCalendarEvent(params: {
  user: GoogleCalendarUserConfig;
  eventId: string;
}) {
  const calendar = await getCalendarClientForUser(params.user);
  await calendar.events.delete({
    calendarId: "primary",
    eventId: params.eventId,
    sendUpdates: "all",
  });
}

export async function saveGoogleSyncSuccess(appointmentId: string, eventId: string | null) {
  await prisma.therapy_appointments.update({
    where: { id: appointmentId },
    data: {
      google_calendar_event_id: eventId,
      google_calendar_last_error: null,
      google_calendar_last_error_at: null,
      google_calendar_last_synced_at: new Date(),
    },
  });
}

export async function saveGoogleSyncFailure(appointmentId: string, message: string) {
  await prisma.therapy_appointments.update({
    where: { id: appointmentId },
    data: {
      google_calendar_last_error: message.slice(0, 1000),
      google_calendar_last_error_at: new Date(),
    },
  });
}

const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

function formatGoogleUntil(endDate: Date): string {
  const x = new Date(endDate);
  x.setUTCHours(23, 59, 59, 0);
  return x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildWeeklyRrule(params: {
  dayOfWeek: number;
  recurrence: "weekly" | "biweekly";
  endDate?: Date | null;
}): string {
  const byday = RRULE_DAYS[params.dayOfWeek] ?? "SU";
  const interval = params.recurrence === "biweekly" ? 2 : 1;
  let rule = `RRULE:FREQ=WEEKLY;BYDAY=${byday};INTERVAL=${interval}`;
  if (params.endDate) {
    rule += `;UNTIL=${formatGoogleUntil(params.endDate)}`;
  }
  return rule;
}

export async function upsertRecurringGoogleCalendarEvent(params: {
  user: GoogleCalendarUserConfig;
  existingEventId: string | null;
  summary: string;
  description: string;
  startIsoUtc: string;
  endIsoUtc: string;
  dayOfWeek: number;
  recurrence: "weekly" | "biweekly";
  seriesEndDate?: Date | null;
}) {
  const calendar = await getCalendarClientForUser(params.user);
  const eventBody = {
    summary: params.summary,
    description: params.description,
    start: { dateTime: params.startIsoUtc, timeZone: APPOINTMENT_TIME_ZONE },
    end: { dateTime: params.endIsoUtc, timeZone: APPOINTMENT_TIME_ZONE },
    recurrence: [
      buildWeeklyRrule({
        dayOfWeek: params.dayOfWeek,
        recurrence: params.recurrence,
        endDate: params.seriesEndDate,
      }),
    ],
  };

  if (params.existingEventId) {
    const updated = await calendar.events.update({
      calendarId: "primary",
      eventId: params.existingEventId,
      requestBody: eventBody,
      sendUpdates: "all",
    });
    return updated.data.id ?? params.existingEventId;
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
    sendUpdates: "all",
  });
  if (!created.data.id) throw new Error("Google Calendar recurring event id missing after create");
  return created.data.id;
}

export async function cancelRecurringGoogleInstance(params: {
  user: GoogleCalendarUserConfig;
  masterEventId: string;
  occurrenceStartIsoUtc: string;
}) {
  const calendar = await getCalendarClientForUser(params.user);
  const instances = await calendar.events.instances({
    calendarId: "primary",
    eventId: params.masterEventId,
    timeMin: new Date(new Date(params.occurrenceStartIsoUtc).getTime() - 24 * 60 * 60 * 1000).toISOString(),
    timeMax: new Date(new Date(params.occurrenceStartIsoUtc).getTime() + 24 * 60 * 60 * 1000).toISOString(),
  });
  const targetMs = new Date(params.occurrenceStartIsoUtc).getTime();
  const match = (instances.data.items ?? []).find((item) => {
    const start = item.start?.dateTime ?? item.start?.date;
    if (!start) return false;
    return Math.abs(new Date(start).getTime() - targetMs) < 60 * 1000;
  });
  if (!match?.id) return;
  await calendar.events.delete({
    calendarId: "primary",
    eventId: match.id,
    sendUpdates: "all",
  });
}

export async function saveGoogleSeriesSyncSuccess(seriesId: string, eventId: string | null) {
  await prisma.therapy_appointment_series.update({
    where: { id: seriesId },
    data: {
      google_calendar_event_id: eventId,
      google_calendar_last_error: null,
      google_calendar_last_error_at: null,
      google_calendar_last_synced_at: new Date(),
    },
  });
}

export async function saveGoogleSeriesSyncFailure(seriesId: string, message: string) {
  await prisma.therapy_appointment_series.update({
    where: { id: seriesId },
    data: {
      google_calendar_last_error: message.slice(0, 1000),
      google_calendar_last_error_at: new Date(),
    },
  });
}

export async function findAllDayGoogleEventByPrivateKey(params: {
  user: GoogleCalendarUserConfig;
  privateKey: string;
}): Promise<string | null> {
  const calendar = await getCalendarClientForUser(params.user);
  const listed = await calendar.events.list({
    calendarId: "primary",
    privateExtendedProperty: [`app=home_finances`, `key=${params.privateKey}`],
    maxResults: 2,
    singleEvents: false,
  });
  const match = (listed.data.items ?? []).find((item) => item.id);
  return match?.id ?? null;
}

function familyCalendarEventBody(params: {
  summary: string;
  description: string;
  startDate: string;
  recurringYearly: boolean;
  allDay: boolean;
  privateKey: string;
}) {
  const extendedProperties = {
    private: {
      app: "home_finances",
      key: params.privateKey,
    },
  };
  if (params.allDay) {
    return {
      summary: params.summary,
      description: params.description,
      start: { date: params.startDate },
      end: { date: addOneIsoCalendarDay(params.startDate) },
      reminders: FAMILY_DATE_REMINDERS,
      extendedProperties,
      ...(params.recurringYearly ? { recurrence: ["RRULE:FREQ=YEARLY"] } : {}),
    };
  }
  const startHour = String(HEBREW_EVENING_START_HOUR).padStart(2, "0");
  const endHour = String(HEBREW_EVENING_END_HOUR).padStart(2, "0");
  return {
    summary: params.summary,
    description: params.description,
    start: { date: null, dateTime: `${params.startDate}T${startHour}:00:00`, timeZone: APPOINTMENT_TIME_ZONE },
    end: { date: null, dateTime: `${params.startDate}T${endHour}:00:00`, timeZone: APPOINTMENT_TIME_ZONE },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup" as const, minutes: 0 },
        ...FAMILY_DATE_REMINDERS.overrides,
      ],
    },
    extendedProperties,
  };
}

export async function upsertAllDayGoogleCalendarEvent(params: {
  user: GoogleCalendarUserConfig;
  existingEventId: string | null;
  summary: string;
  description: string;
  startDate: string;
  recurringYearly: boolean;
  allDay?: boolean;
  privateKey: string;
}): Promise<string> {
  const calendar = await getCalendarClientForUser(params.user);
  const eventBody = familyCalendarEventBody({
    summary: params.summary,
    description: params.description,
    startDate: params.startDate,
    recurringYearly: params.recurringYearly,
    allDay: params.allDay !== false,
    privateKey: params.privateKey,
  });

  let eventId = params.existingEventId;
  if (!eventId) {
    try {
      eventId = await findAllDayGoogleEventByPrivateKey({
        user: params.user,
        privateKey: params.privateKey,
      });
    } catch {
      eventId = null;
    }
  }

  if (eventId) {
    try {
      const updated = await calendar.events.update({
        calendarId: "primary",
        eventId,
        requestBody: eventBody,
        sendUpdates: "none",
      });
      return updated.data.id ?? eventId;
    } catch (error) {
      if (!isGoogleNotFound(error)) throw error;
    }
  }

  const created = await calendar.events.insert({
    calendarId: "primary",
    requestBody: eventBody,
    sendUpdates: "none",
  });
  if (!created.data.id) throw new Error("Google Calendar all-day event id missing after create");
  return created.data.id;
}

export async function deleteGoogleCalendarEventIfExists(params: {
  user: GoogleCalendarUserConfig;
  eventId: string;
}): Promise<void> {
  try {
    await deleteGoogleCalendarEvent(params);
  } catch (error) {
    if (isGoogleNotFound(error)) return;
    throw error;
  }
}
