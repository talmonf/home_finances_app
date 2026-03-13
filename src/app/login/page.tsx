import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const callbackUrl = searchParams?.callbackUrl;

  return (
    <Suspense fallback={null}>
      <LoginForm callbackUrl={callbackUrl} />
    </Suspense>
  );
}

