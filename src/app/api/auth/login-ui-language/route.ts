import { NextResponse } from "next/server";
import {
  LOGIN_UI_LANGUAGE_COOKIE,
  LOGIN_UI_LANGUAGE_COOKIE_OPTIONS,
} from "@/lib/login-ui-language-cookie";
import { normalizeUiLanguage } from "@/lib/ui-language";

export async function POST(request: Request) {
  let body: { language?: string };
  try {
    body = (await request.json()) as { language?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const language = normalizeUiLanguage(body.language);
  const res = NextResponse.json({ language });
  res.cookies.set(LOGIN_UI_LANGUAGE_COOKIE, language, LOGIN_UI_LANGUAGE_COOKIE_OPTIONS);
  return res;
}
