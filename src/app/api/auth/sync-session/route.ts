import type { GetServerSidePropsContext } from "next";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function safeRelativeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }
  return raw;
}

/**
 * Re-issues the JWT session cookie after server-side changes (e.g. password cleared
 * must_change_password) so middleware sees an up-to-date token without visiting
 * the NextAuth sign-out page.
 */
export async function GET(request: NextRequest) {
  const callbackUrl = safeRelativeCallback(request.nextUrl.searchParams.get("callbackUrl"));

  const req = {
    headers: Object.fromEntries(request.headers),
    cookies: Object.fromEntries(request.cookies.getAll().map((c) => [c.name, c.value])),
  };

  const setCookieHeaders: string[] = [];
  const res = {
    getHeader(name: string) {
      if (name.toLowerCase() !== "set-cookie") return undefined;
      return setCookieHeaders;
    },
    setHeader(name: string, value: string | string[]) {
      if (name.toLowerCase() !== "set-cookie") return;
      setCookieHeaders.splice(0, setCookieHeaders.length, ...(Array.isArray(value) ? value : [value]));
    },
  };

  // NextAuth types expect Node IncomingMessage/ServerResponse; this minimal shape is enough
  // for the session handler to refresh the JWT cookie (see next-auth getServerSession implementation).
  const session = await getServerSession(
    req as GetServerSidePropsContext["req"],
    res as GetServerSidePropsContext["res"],
    authOptions,
  );

  if (!session) {
    return NextResponse.redirect(new URL("/login?callbackUrl=%2Fchange-password", request.url));
  }

  const target = new URL(callbackUrl, request.url);
  const response = NextResponse.redirect(target);

  for (const line of setCookieHeaders) {
    response.headers.append("Set-Cookie", line);
  }

  return response;
}
