/** Pre-auth UI language preference (login page + logged-out shell). */
export const LOGIN_UI_LANGUAGE_COOKIE = "hf_ui_language";

export const LOGIN_UI_LANGUAGE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};
