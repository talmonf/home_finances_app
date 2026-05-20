import { resolveLoginPageUiLanguage } from "@/lib/login-ui-language";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
    portal?: string;
    lang?: string;
  }>;
};

function loginQuerySuffix(params: {
  callbackUrl?: string;
  passwordUpdated?: string;
  portal?: string;
  lang?: string;
}): string {
  const qs = new URLSearchParams();
  if (params.callbackUrl) {
    qs.set("callbackUrl", params.callbackUrl);
  }
  if (params.passwordUpdated === "1") {
    qs.set("passwordUpdated", "1");
  }
  const lang = params.lang?.trim();
  if (lang === "en" || lang === "he") {
    qs.set("lang", lang);
  }
  if (params.portal === "home") {
    qs.set("portal", "home");
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (resolvedSearchParams?.portal === "clinic") {
    const { portal: _portal, ...rest } = resolvedSearchParams;
    redirect(`/login${loginQuerySuffix(rest)}`);
  }

  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";
  const langParam = resolvedSearchParams?.lang?.trim();
  const pinInitialLanguage = langParam === "en" || langParam === "he";
  const initialLanguage = await resolveLoginPageUiLanguage();
  const portal = resolvedSearchParams?.portal === "home" ? "home" : "clinic";

  return (
    <Suspense fallback={null}>
      <LoginForm
        portal={portal}
        initialLanguage={initialLanguage}
        pinInitialLanguage={pinInitialLanguage}
        callbackUrl={callbackUrl}
        passwordUpdated={passwordUpdated}
      />
    </Suspense>
  );
}
