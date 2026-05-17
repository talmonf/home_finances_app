import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
    portal?: string;
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
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    redirect(`/login/clinic${suffix}`);
  }

  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";

  return (
    <Suspense fallback={null}>
      <LoginForm
        portal="home"
        callbackUrl={callbackUrl}
        passwordUpdated={passwordUpdated}
      />
    </Suspense>
  );
}

