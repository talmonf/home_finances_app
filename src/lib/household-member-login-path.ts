const FAMILY_CALENDAR_SETTINGS_PATH = "/dashboard/upcoming-renewals/email-settings";

/** Login URL for a household page opened without a household session. */
export function householdMemberLoginPath(pathname: string): string {
  const path =
    pathname.startsWith("/") && !pathname.startsWith("//") ? pathname.split("?")[0]! : "/";
  const params = new URLSearchParams();
  if (!path.startsWith("/dashboard/private-clinic")) {
    params.set("portal", "home");
  }
  params.set("callbackUrl", path);
  if (
    path === FAMILY_CALENDAR_SETTINGS_PATH ||
    path.startsWith(`${FAMILY_CALENDAR_SETTINGS_PATH}/`)
  ) {
    params.set("notice", "household-calendar");
  }
  return `/login?${params.toString()}`;
}
