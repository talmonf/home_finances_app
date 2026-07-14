import { NextResponse } from "next/server";

export const GOOGLE_OAUTH_STATE_COOKIE = "gc_oauth_state";
export const GOOGLE_OAUTH_RETURN_COOKIE = "gc_oauth_return_to";

/** Short-lived cookies for the Google OAuth round-trip. */
export function googleOAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  };
}

export function redirectWithGoogleOAuthCookies(
  destination: string | URL,
  values: { state: string; returnTo: string },
) {
  const response = NextResponse.redirect(destination);
  const opts = googleOAuthCookieOptions();
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, values.state, opts);
  response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, values.returnTo, opts);
  return response;
}

export function clearGoogleOAuthCookies(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set(GOOGLE_OAUTH_RETURN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}
