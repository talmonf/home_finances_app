export type FamilyCalendarEligibilityInput = {
  hasRefreshToken: boolean;
  google_calendar_sync_family_dates: boolean;
  google_calendar_enabled: boolean;
  hasActiveRenewalDigest: boolean;
};

/**
 * Family dates go to Google when the account is connected and the user already
 * opted into date reminders (digest), clinic calendar, or the family-dates toggle.
 */
export function isFamilyCalendarSyncEligible(user: FamilyCalendarEligibilityInput): boolean {
  if (!user.hasRefreshToken) return false;
  return (
    user.google_calendar_sync_family_dates ||
    user.google_calendar_enabled ||
    user.hasActiveRenewalDigest
  );
}
