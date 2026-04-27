import { prisma } from "@/lib/auth";
import { decryptGoogleToken, getGoogleOAuthClient } from "@/lib/google-calendar/oauth";
import { google } from "googleapis";

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
  if (!user.google_calendar_enabled) throw new Error("Google Calendar integration is disabled");
  const accessToken = decryptGoogleToken(user.google_calendar_access_token_encrypted);
  const refreshToken = decryptGoogleToken(user.google_calendar_refresh_token_encrypted);
  if (!accessToken || !refreshToken) throw new Error("Google Calendar account is not connected");
  return { accessToken, refreshToken };
}

async function getCalendarClientForUser(user: GoogleCalendarUserConfig) {
  const { accessToken, refreshToken } = assertGoogleUserReady(user);
  const auth = getGoogleOAuthClient();
  auth.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: user.google_calendar_token_expires_at?.getTime() ?? undefined,
  });
  return google.calendar({ version: "v3", auth });
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
    start: { dateTime: params.startIsoUtc },
    end: { dateTime: params.endIsoUtc },
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
