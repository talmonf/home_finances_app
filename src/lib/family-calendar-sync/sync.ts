import { prisma } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/email/app-base-url";
import { getEmailProvider, isMissingEmailConfigError } from "@/lib/email/provider";
import {
  buildDesiredFamilyCalendarEvents,
  liveFamilyCalendarSourceKeys,
  type FamilyCalendarHouseholdInput,
} from "@/lib/family-calendar-sync/desired";
import { familyCalendarSyncKey } from "@/lib/family-calendar-sync/keys";
import {
  renderFamilyCalendarFailureEmail,
  shouldSendFamilyCalendarFailureEmail,
  type FamilyCalendarFailureItem,
} from "@/lib/family-calendar-sync/notify";
import {
  planFamilyCalendarReconcile,
  type ExistingFamilyCalendarMapping,
} from "@/lib/family-calendar-sync/reconcile";
import {
  deleteGoogleCalendarEventIfExists,
  isGmailAddress,
  upsertAllDayGoogleCalendarEvent,
  type GoogleCalendarUserConfig,
} from "@/lib/google-calendar/calendar";
import { normalizeUiLanguage } from "@/lib/ui-language";
import type { FamilyCalendarKind, FamilyCalendarSourceKind } from "@/generated/prisma/enums";

const FAMILY_CALENDAR_SETTINGS_PATH = "/dashboard/upcoming-renewals/email-settings";

type FamilyCalendarUserRow = GoogleCalendarUserConfig & {
  email: string;
  ui_language: string | null;
  google_calendar_sync_family_dates: boolean;
  family_calendar_sync_failure_notified_at: Date | null;
};

function toExistingMapping(row: {
  id: string;
  source_kind: FamilyCalendarSourceKind;
  source_id: string;
  calendar_kind: FamilyCalendarKind;
  occurrence_key: string;
  google_event_id: string | null;
}): ExistingFamilyCalendarMapping {
  return {
    id: row.id,
    sourceKind: row.source_kind,
    sourceId: row.source_id,
    calendarKind: row.calendar_kind,
    occurrenceKey: row.occurrence_key,
    googleEventId: row.google_event_id,
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.slice(0, 1000);
  return String(error).slice(0, 1000);
}

async function loadHouseholdInput(householdId: string): Promise<FamilyCalendarHouseholdInput> {
  const [members, marriages, specialDates] = await Promise.all([
    prisma.family_members.findMany({
      where: { household_id: householdId },
      select: {
        id: true,
        full_name: true,
        is_active: true,
        date_of_birth: true,
        hebrew_date_of_birth_day: true,
        hebrew_date_of_birth_month: true,
        hebrew_date_of_birth_year: true,
      },
    }),
    prisma.family_marriages.findMany({
      where: { household_id: householdId },
      include: {
        spouse_a: { select: { id: true, full_name: true, is_active: true } },
        spouse_b: { select: { id: true, full_name: true, is_active: true } },
      },
    }),
    prisma.family_special_dates.findMany({
      where: { household_id: householdId },
      include: {
        family_member: { select: { id: true, full_name: true, is_active: true } },
      },
    }),
  ]);
  return { members, marriages, specialDates };
}

async function loadFamilyCalendarUsers(householdId: string): Promise<FamilyCalendarUserRow[]> {
  return prisma.users.findMany({
    where: {
      household_id: householdId,
      is_active: true,
      google_calendar_sync_family_dates: true,
    },
    select: {
      id: true,
      household_id: true,
      email: true,
      ui_language: true,
      google_calendar_enabled: true,
      google_gmail_address: true,
      google_calendar_access_token_encrypted: true,
      google_calendar_refresh_token_encrypted: true,
      google_calendar_token_expires_at: true,
      google_calendar_sync_family_dates: true,
      family_calendar_sync_failure_notified_at: true,
    },
  });
}

function userReadyForGoogle(user: FamilyCalendarUserRow): boolean {
  return Boolean(
    user.google_calendar_refresh_token_encrypted &&
      user.google_gmail_address &&
      isGmailAddress(user.google_gmail_address),
  );
}

async function notifyFamilyCalendarFailures(params: {
  user: FamilyCalendarUserRow;
  items: FamilyCalendarFailureItem[];
  now: Date;
  language: "en" | "he";
}) {
  if (
    !shouldSendFamilyCalendarFailureEmail({
      hasFailures: params.items.length > 0,
      lastNotifiedAt: params.user.family_calendar_sync_failure_notified_at,
      now: params.now,
    })
  ) {
    return;
  }

  try {
    const provider = getEmailProvider();
    const rendered = renderFamilyCalendarFailureEmail({
      language: params.language,
      items: params.items,
      settingsUrl: `${getAppBaseUrl()}${FAMILY_CALENDAR_SETTINGS_PATH}`,
    });
    await provider.send({
      to: params.user.email,
      ...rendered,
    });
    await prisma.users.update({
      where: { id: params.user.id },
      data: { family_calendar_sync_failure_notified_at: params.now },
    });
    params.user.family_calendar_sync_failure_notified_at = params.now;
  } catch (error) {
    if (isMissingEmailConfigError(error)) return;
    console.error("[family-calendar-sync] failure email", params.user.id, error);
  }
}

async function syncFamilyCalendarForUser(params: {
  user: FamilyCalendarUserRow;
  household: FamilyCalendarHouseholdInput;
  now: Date;
}): Promise<{ failures: number }> {
  const language = normalizeUiLanguage(params.user.ui_language ?? "en");
  const desired = buildDesiredFamilyCalendarEvents({
    household: params.household,
    today: params.now,
    language,
    baseUrl: getAppBaseUrl(),
  });
  const liveSourceKeys = liveFamilyCalendarSourceKeys(params.household);
  const existingRows = await prisma.family_calendar_sync_events.findMany({
    where: { user_id: params.user.id, household_id: params.user.household_id },
  });
  const existing = existingRows.map(toExistingMapping);
  const plan = planFamilyCalendarReconcile({
    desired,
    existing,
    liveSourceKeys,
    today: params.now,
  });

  const failures: FamilyCalendarFailureItem[] = [];

  if (!userReadyForGoogle(params.user)) {
    const message = "Google Calendar account is not connected";
    await prisma.users.update({
      where: { id: params.user.id },
      data: {
        family_calendar_sync_error: message,
        family_calendar_sync_error_at: params.now,
      },
    });
    failures.push({ summary: language === "he" ? "חיבור Google Calendar" : "Google Calendar connection", error: message });
    await notifyFamilyCalendarFailures({
      user: params.user,
      items: failures,
      now: params.now,
      language,
    });
    return { failures: failures.length };
  }

  for (const row of plan.deletes) {
    try {
      if (row.googleEventId) {
        await deleteGoogleCalendarEventIfExists({ user: params.user, eventId: row.googleEventId });
      }
      await prisma.family_calendar_sync_events.delete({ where: { id: row.id } });
    } catch (error) {
      const message = errorMessage(error);
      failures.push({ summary: familyCalendarSyncKey(row), error: message });
      await prisma.family_calendar_sync_events.update({
        where: { id: row.id },
        data: { last_error: message, last_error_at: params.now },
      });
    }
  }

  for (const event of plan.upserts) {
    try {
      const googleEventId = await upsertAllDayGoogleCalendarEvent({
        user: params.user,
        existingEventId: event.existingEventId,
        summary: event.summary,
        description: event.description,
        startDate: event.startDate,
        recurringYearly: event.recurringYearly,
        privateKey: familyCalendarSyncKey(event),
      });
      await prisma.family_calendar_sync_events.upsert({
        where: {
          user_id_source_kind_source_id_calendar_kind_occurrence_key: {
            user_id: params.user.id,
            source_kind: event.sourceKind,
            source_id: event.sourceId,
            calendar_kind: event.calendarKind,
            occurrence_key: event.occurrenceKey,
          },
        },
        create: {
          household_id: params.user.household_id,
          user_id: params.user.id,
          source_kind: event.sourceKind,
          source_id: event.sourceId,
          calendar_kind: event.calendarKind,
          occurrence_key: event.occurrenceKey,
          google_event_id: googleEventId,
          last_synced_at: params.now,
          last_error: null,
          last_error_at: null,
        },
        update: {
          google_event_id: googleEventId,
          last_synced_at: params.now,
          last_error: null,
          last_error_at: null,
        },
      });
    } catch (error) {
      const message = errorMessage(error);
      failures.push({ summary: event.summary, error: message });
      await prisma.family_calendar_sync_events.upsert({
        where: {
          user_id_source_kind_source_id_calendar_kind_occurrence_key: {
            user_id: params.user.id,
            source_kind: event.sourceKind,
            source_id: event.sourceId,
            calendar_kind: event.calendarKind,
            occurrence_key: event.occurrenceKey,
          },
        },
        create: {
          household_id: params.user.household_id,
          user_id: params.user.id,
          source_kind: event.sourceKind,
          source_id: event.sourceId,
          calendar_kind: event.calendarKind,
          occurrence_key: event.occurrenceKey,
          last_error: message,
          last_error_at: params.now,
        },
        update: {
          last_error: message,
          last_error_at: params.now,
        },
      });
    }
  }

  if (failures.length === 0) {
    await prisma.users.update({
      where: { id: params.user.id },
      data: {
        family_calendar_sync_error: null,
        family_calendar_sync_error_at: null,
        family_calendar_sync_failure_notified_at: null,
      },
    });
    params.user.family_calendar_sync_failure_notified_at = null;
    return { failures: 0 };
  }

  await prisma.users.update({
    where: { id: params.user.id },
    data: {
      family_calendar_sync_error: failures[0]!.error.slice(0, 1000),
      family_calendar_sync_error_at: params.now,
    },
  });
  await notifyFamilyCalendarFailures({
    user: params.user,
    items: failures,
    now: params.now,
    language,
  });
  return { failures: failures.length };
}

export async function syncHouseholdFamilyCalendar(
  householdId: string,
  now: Date = new Date(),
): Promise<{ users: number; failures: number }> {
  const users = await loadFamilyCalendarUsers(householdId);
  if (users.length === 0) return { users: 0, failures: 0 };
  const household = await loadHouseholdInput(householdId);
  let failures = 0;
  for (const user of users) {
    const result = await syncFamilyCalendarForUser({ user, household, now });
    failures += result.failures;
  }
  return { users: users.length, failures };
}

export async function syncHouseholdFamilyCalendarSafe(householdId: string): Promise<void> {
  try {
    await syncHouseholdFamilyCalendar(householdId);
  } catch (error) {
    console.error("[family-calendar-sync] household", householdId, error);
  }
}

export async function syncAllFamilyCalendars(
  now: Date = new Date(),
): Promise<{ households: number; users: number; failures: number; errors: string[] }> {
  const enabled = await prisma.users.findMany({
    where: { is_active: true, google_calendar_sync_family_dates: true },
    select: { household_id: true },
  });
  const householdIds = [...new Set(enabled.map((row) => row.household_id))];
  let users = 0;
  let failures = 0;
  const errors: string[] = [];
  for (const householdId of householdIds) {
    try {
      const result = await syncHouseholdFamilyCalendar(householdId, now);
      users += result.users;
      failures += result.failures;
    } catch (error) {
      errors.push(`${householdId}: ${errorMessage(error)}`);
    }
  }
  return { households: householdIds.length, users, failures, errors };
}
