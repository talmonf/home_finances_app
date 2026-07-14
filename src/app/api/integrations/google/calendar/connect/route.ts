import { getAuthSession } from "@/lib/auth";
import { buildGoogleConsentUrl } from "@/lib/google-calendar/oauth";
import { redirectWithGoogleOAuthCookies } from "@/lib/google-calendar/oauth-cookies";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard/private-clinic/settings";
  }
  return raw;
}

function redirectUriHostMismatch(requestUrl: string): boolean {
  const configured = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!configured) return false;
  try {
    return new URL(configured).host !== new URL(requestUrl).host;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));

  // OAuth state cookies are host-scoped. Starting connect on a different host
  // than GOOGLE_REDIRECT_URI causes a state mismatch on callback.
  if (redirectUriHostMismatch(request.url)) {
    return NextResponse.redirect(new URL(`${returnTo}?error=google-oauth-host`, request.url));
  }

  const state = randomUUID();
  const consentUrl = buildGoogleConsentUrl(state);

  // Attach cookies to the redirect response. cookies().set() alone is not
  // reliably applied when returning NextResponse.redirect() (Next 15+).
  return redirectWithGoogleOAuthCookies(consentUrl, { state, returnTo });
}
