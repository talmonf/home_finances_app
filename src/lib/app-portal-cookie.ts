/** Preference cookie for pre-auth login branding (clinic vs home). Household members use section visibility instead; super admins always use home. */
export const APP_PORTAL_COOKIE = "hf_app_portal";

/** Set/cleared in middleware — cookies() cannot be written from Server Components. */
export const APP_PORTAL_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};
