import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
    passwordUpdated?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = resolvedSearchParams?.callbackUrl;
  const passwordUpdated = resolvedSearchParams?.passwordUpdated === "1";

  return (
    <Suspense fallback={null}>
      <LoginForm callbackUrl={callbackUrl} passwordUpdated={passwordUpdated} />
    </Suspense>
  );
}

