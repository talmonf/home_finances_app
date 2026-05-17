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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (resolvedSearchParams?.portal === "clinic") {
    const qs = new URLSearchParams();
    if (resolvedSearchParams.callbackUrl) {
      qs.set("callbackUrl", resolvedSearchParams.callbackUrl);
    }
    if (resolvedSearchParams.passwordUpdated === "1") {
      qs.set("passwordUpdated", "1");
    }
    const lang = resolvedSearchParams.lang?.trim();
    if (lang === "en" || lang === "he") {
      qs.set("lang", lang);
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/login/clinic${suffix}`);
  }

  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";
  const langParam = resolvedSearchParams?.lang?.trim();
  const pinInitialLanguage = langParam === "en" || langParam === "he";
  const initialLanguage = await resolveLoginPageUiLanguage();

  return (
    <Suspense fallback={null}>
      <LoginForm
        portal="home"
        initialLanguage={initialLanguage}
        pinInitialLanguage={pinInitialLanguage}
        callbackUrl={callbackUrl}
        passwordUpdated={passwordUpdated}
      />
    </Suspense>
  );
}

