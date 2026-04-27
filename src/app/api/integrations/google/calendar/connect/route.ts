import { getAuthSession } from "@/lib/auth";
import { buildGoogleConsentUrl } from "@/lib/google-calendar/oauth";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STATE_COOKIE = "gc_oauth_state";
const RETURN_COOKIE = "gc_oauth_return_to";

function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard/private-clinic/settings";
  }
  return raw;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.isSuperAdmin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const returnTo = safeReturnTo(url.searchParams.get("returnTo"));
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", path: "/" });
  cookieStore.set(RETURN_COOKIE, returnTo, { httpOnly: true, sameSite: "lax", path: "/" });

  const consentUrl = buildGoogleConsentUrl(state);
  return NextResponse.redirect(consentUrl);
}
