import { getAuthSession, prisma } from "@/lib/auth";
import { exchangeGoogleCodeForTokens, saveGoogleTokensForUser } from "@/lib/google-calendar/oauth";
import {
  clearGoogleOAuthCookies,
  GOOGLE_OAUTH_RETURN_COOKIE,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google-calendar/oauth-cookies";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) {
    // Preserve the Google callback so login can finish the OAuth exchange.
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", `${url.pathname}${url.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? null;
  const returnTo = cookieStore.get(GOOGLE_OAUTH_RETURN_COOKIE)?.value ?? "/dashboard/private-clinic/settings";

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = NextResponse.redirect(new URL(`${returnTo}?error=google-oauth-state`, request.url));
    return clearGoogleOAuthCookies(response);
  }

  try {
    const tokens = await exchangeGoogleCodeForTokens(code);
    await saveGoogleTokensForUser({
      userId: session.user.id,
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? "",
      expiryDateMs: tokens.expiry_date ?? null,
      scope: tokens.scope ?? null,
    });
    const response = NextResponse.redirect(new URL(`${returnTo}?saved=google-connected`, request.url));
    return clearGoogleOAuthCookies(response);
  } catch (error) {
    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        google_calendar_sync_error:
          error instanceof Error ? error.message.slice(0, 1000) : "OAuth callback failed",
        google_calendar_sync_error_at: new Date(),
      },
    });
    const response = NextResponse.redirect(new URL(`${returnTo}?error=google-oauth`, request.url));
    return clearGoogleOAuthCookies(response);
  }
}
