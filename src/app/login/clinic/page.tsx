import { resolveLoginPageUiLanguage } from "@/lib/login-ui-language";
import { Suspense } from "react";
import { LoginForm } from "../LoginForm";

type LoginClinicPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
    lang?: string;
  }>;
};

export default async function LoginClinicPage({ searchParams }: LoginClinicPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";
  const langParam = resolvedSearchParams?.lang?.trim();
  const pinInitialLanguage = langParam === "en" || langParam === "he";
  const initialLanguage = await resolveLoginPageUiLanguage();

  return (
    <Suspense fallback={null}>
      <LoginForm
        portal="clinic"
        initialLanguage={initialLanguage}
        pinInitialLanguage={pinInitialLanguage}
        callbackUrl={callbackUrl}
        passwordUpdated={passwordUpdated}
      />
    </Suspense>
  );
}
