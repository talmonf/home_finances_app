import { getAuthSession } from "@/lib/auth";
import { passwordPolicyRequirementLines } from "@/lib/password-policy";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string }>;
};

async function ChangePasswordContent({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect("/login?callbackUrl=%2Fchange-password");
  }

  const resolved = searchParams ? await searchParams : undefined;
  const error = resolved?.error ? decodeURIComponent(resolved.error) : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-50">Change password</h1>
        <p className="mb-4 text-center text-sm text-slate-400">
          {session.user.passwordActionRequired
            ? "Your account requires a new password before you can continue."
            : "Set a new password for your account."}
        </p>
        <div
          className="mb-6 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-left ring-1 ring-slate-800/80"
          role="region"
          aria-label="Password requirements"
        >
          <p className="mb-2 text-sm font-semibold text-slate-200">Password requirements</p>
          <ul className="list-inside list-disc space-y-1 text-xs text-slate-400">
            {passwordPolicyRequirementLines().map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <ChangePasswordForm error={error} />
        <div className="mt-6 flex justify-center border-t border-slate-800 pt-6">
          <SignOutButton label="Sign out" confirmMessage="Sign out?" />
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage(props: PageProps) {
  return (
    <Suspense fallback={null}>
      <ChangePasswordContent {...props} />
    </Suspense>
  );
}
