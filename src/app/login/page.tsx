import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = resolvedSearchParams?.callbackUrl;

  return (
    <Suspense fallback={null}>
      <LoginForm callbackUrl={callbackUrl} />
    </Suspense>
  );
}

