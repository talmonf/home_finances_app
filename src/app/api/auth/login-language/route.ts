import { NextResponse } from "next/server";
import { lookupUiLanguageForLoginEmail } from "@/lib/login-ui-language";
import { clientIpFromRequest, loginRatelimit } from "@/lib/rate-limit";
import { normalizeUiLanguage } from "@/lib/ui-language";

export async function GET(request: Request) {
  if (loginRatelimit) {
    const ip = clientIpFromRequest(request);
    const { success } = await loginRatelimit.limit(`login-lang:${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ language: null });
  }

  const language = await lookupUiLanguageForLoginEmail(email);
  if (!language) {
    return NextResponse.json({ language: null });
  }

  return NextResponse.json({ language: normalizeUiLanguage(language) });
}
