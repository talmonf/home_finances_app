import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  clientIpFromRequest,
  expensiveApiRatelimit,
  loginRatelimit,
} from "@/lib/rate-limit";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    if (
      pathname === "/api/auth/callback/credentials" &&
      req.method === "POST" &&
      loginRatelimit
    ) {
      const ip = clientIpFromRequest(req);
      const { success } = await loginRatelimit.limit(`login:${ip}`);
      if (!success) {
        return NextResponse.json(
          { error: "Too many sign-in attempts. Try again later." },
          { status: 429 },
        );
      }
    }
    return NextResponse.next();
  }

  const expensivePath =
    (pathname === "/api/import/assist" && req.method === "POST") ||
    (/\/api\/private-clinic\/treatment-attachments\/[^/]+\/transcribe$/.test(pathname) &&
      req.method === "POST");

  if (expensivePath && expensiveApiRatelimit) {
    const tokenEarly = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const id = tokenEarly?.sub
      ? `u:${tokenEarly.sub}`
      : `ip:${clientIpFromRequest(req)}`;
    const { success } = await expensiveApiRatelimit.limit(`expensive:${id}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const callbackUrl = encodeURIComponent(
      req.nextUrl.pathname + req.nextUrl.search,
    );
    const loginUrl = new URL(`/login?callbackUrl=${callbackUrl}`, req.url);
    return NextResponse.redirect(loginUrl);
  }

  const passwordActionRequired = Boolean(
    (token as { passwordActionRequired?: boolean }).passwordActionRequired,
  );
  if (passwordActionRequired) {
    const exempt =
      pathname.startsWith("/change-password") || pathname.startsWith("/api/auth");
    if (!exempt) {
      const changeUrl = new URL("/change-password", req.url);
      return NextResponse.redirect(changeUrl);
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
