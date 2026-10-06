export const GOOGLE_CALENDAR_SETTINGS_PATH = "/dashboard/upcoming-renewals/email-settings";
export const GOOGLE_CALENDAR_RECONNECT_HASH = "google-calendar";

export function isGoogleCalendarSettingsPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return path === GOOGLE_CALENDAR_SETTINGS_PATH || path.startsWith(`${GOOGLE_CALENDAR_SETTINGS_PATH}/`);
}

/** Settings page, scrolled to the reconnect control. */
export function googleCalendarReconnectHref(pathAndSearch = GOOGLE_CALENDAR_SETTINGS_PATH): string {
  const withoutHash = pathAndSearch.split("#")[0] || GOOGLE_CALENDAR_SETTINGS_PATH;
  return `${withoutHash}#${GOOGLE_CALENDAR_RECONNECT_HASH}`;
}

/** Keep in-app login returns on this site, including a #fragment. */
export function safePostLoginPath(raw: string | undefined): string {
  if (!raw) return "/";
  const hashIndex = raw.indexOf("#");
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : "";
  const withoutHash = (hashIndex >= 0 ? raw.slice(0, hashIndex) : raw).trim();
  if (!withoutHash.startsWith("/") || withoutHash.startsWith("//")) return "/";
  if (hash && !/^#[A-Za-z0-9_-]+$/.test(hash)) return withoutHash;
  return `${withoutHash}${hash}`;
}

/** Login URL for a household page opened without a household session. */
export function householdMemberLoginPath(pathname: string): string {
  const path =
    pathname.startsWith("/") && !pathname.startsWith("//") ? pathname.split("?")[0]! : "/";
  const params = new URLSearchParams();
  if (!path.startsWith("/dashboard/private-clinic")) {
    params.set("portal", "home");
  }
  const callbackUrl = isGoogleCalendarSettingsPath(path) ? googleCalendarReconnectHref(path) : path;
  params.set("callbackUrl", callbackUrl);
  if (isGoogleCalendarSettingsPath(path)) {
    params.set("notice", "household-calendar");
  }
  return `/login?${params.toString()}`;
}
