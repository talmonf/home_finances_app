import { Suspense } from "react";
import { LoginForm } from "../LoginForm";

type LoginClinicPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
  }>;
};

export default async function LoginClinicPage({ searchParams }: LoginClinicPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";

  return (
    <Suspense fallback={null}>
      <LoginForm
        portal="clinic"
        callbackUrl={callbackUrl}
        passwordUpdated={passwordUpdated}
      />
    </Suspense>
  );
}
