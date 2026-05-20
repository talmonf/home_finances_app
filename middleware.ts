import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  APP_PORTAL_COOKIE,
  APP_PORTAL_COOKIE_OPTIONS,
} from "@/lib/app-portal-cookie";
import {
  LOGIN_UI_LANGUAGE_COOKIE,
  LOGIN_UI_LANGUAGE_COOKIE_OPTIONS,
} from "@/lib/login-ui-language-cookie";
import {
  clientIpFromRequest,
  expensiveApiRatelimit,
  loginRatelimit,
} from "@/lib/rate-limit";

function applyLoginUiLanguageFromQuery(req: NextRequest, res: NextResponse): NextResponse {
  const lang = req.nextUrl.searchParams.get("lang");
  if (lang === "en" || lang === "he") {
    res.cookies.set(LOGIN_UI_LANGUAGE_COOKIE, lang, LOGIN_UI_LANGUAGE_COOKIE_OPTIONS);
  }
  return res;
}

function applyLoginPortalCookie(
  pathname: string,
  req: NextRequest,
  res: NextResponse,
): NextResponse {
  if (pathname === "/login/clinic" || pathname.startsWith("/login/clinic/")) {
    res.cookies.set(APP_PORTAL_COOKIE, "clinic", APP_PORTAL_COOKIE_OPTIONS);
    return res;
  }
  if (pathname === "/login") {
    const portal = req.nextUrl.searchParams.get("portal");
    res.cookies.set(
      APP_PORTAL_COOKIE,
      portal === "home" ? "home" : "clinic",
      APP_PORTAL_COOKIE_OPTIONS,
    );
    return res;
  }
  return res;
}

function applyLoginRouteCookies(pathname: string, req: NextRequest): NextResponse {
  let res = NextResponse.next();
  res = applyLoginUiLanguageFromQuery(req, res);
  if (pathname.startsWith("/login")) {
    res = applyLoginPortalCookie(pathname, req, res);
  }
  return res;
}

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

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    return applyLoginRouteCookies(pathname, req);
  }

  if (pathname === "/" && req.nextUrl.searchParams.get("lang")) {
    return applyLoginUiLanguageFromQuery(req, NextResponse.next());
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const callbackUrl = encodeURIComponent(
      req.nextUrl.pathname + req.nextUrl.search,
    );
    const clinicLogin = pathname.startsWith("/dashboard/private-clinic");
    const loginPath = clinicLogin ? "/login" : "/login?portal=home";
    const loginUrl = new URL(
      `${loginPath}${loginPath.includes("?") ? "&" : "?"}callbackUrl=${callbackUrl}`,
      req.url,
    );
    const redirect = NextResponse.redirect(loginUrl);
    redirect.cookies.set(
      APP_PORTAL_COOKIE,
      clinicLogin ? "clinic" : "home",
      APP_PORTAL_COOKIE_OPTIONS,
    );
    return redirect;
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
