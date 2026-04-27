import { getAuthSession, prisma } from "@/lib/auth";
import { exchangeGoogleCodeForTokens, saveGoogleTokensForUser } from "@/lib/google-calendar/oauth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STATE_COOKIE = "gc_oauth_state";
const RETURN_COOKIE = "gc_oauth_return_to";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value ?? null;
  const returnTo = cookieStore.get(RETURN_COOKIE)?.value ?? "/dashboard/private-clinic/settings";
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(RETURN_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL(`${returnTo}?error=google-oauth-state`, request.url));
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
    return NextResponse.redirect(new URL(`${returnTo}?saved=google-connected`, request.url));
  } catch (error) {
    await prisma.users.update({
      where: { id: session.user.id },
      data: {
        google_calendar_sync_error: error instanceof Error ? error.message.slice(0, 1000) : "OAuth callback failed",
        google_calendar_sync_error_at: new Date(),
      },
    });
    return NextResponse.redirect(new URL(`${returnTo}?error=google-oauth`, request.url));
  }
}
