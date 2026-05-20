"use client";

import { PasswordInputWithToggle } from "@/components/PasswordInputWithToggle";
import type { AppPortal } from "@/lib/app-branding-strings";
import { loginPageStrings } from "@/lib/login-i18n";
import { uiLanguageDirection, type UiLanguage } from "@/lib/ui-language";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

async function persistLoginUiLanguage(language: UiLanguage) {
  await fetch("/api/auth/login-ui-language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
}

export function LoginForm({
  portal = "clinic",
  initialLanguage = "en",
  pinInitialLanguage = false,
  callbackUrl,
  passwordUpdated,
}: {
  portal?: AppPortal;
  initialLanguage?: UiLanguage;
  /** When true (e.g. `?lang=he`), email lookup will not change the login language. */
  pinInitialLanguage?: boolean;
  callbackUrl?: string;
  passwordUpdated?: boolean;
}) {
  const [language, setLanguage] = useState<UiLanguage>(initialLanguage);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const languagePinnedByUser = useRef(pinInitialLanguage);
  const emailLookupGeneration = useRef(0);

  useEffect(() => {
    if (pinInitialLanguage) {
      languagePinnedByUser.current = true;
    }
  }, [pinInitialLanguage]);

  const copy = loginPageStrings(portal, language);
  const dir = uiLanguageDirection(language);

  const applyLanguage = useCallback(async (next: UiLanguage, fromUser: boolean) => {
    setLanguage(next);
    if (fromUser) {
      languagePinnedByUser.current = true;
    }
    await persistLoginUiLanguage(next);
  }, []);

  useEffect(() => {
    if (pinInitialLanguage) {
      return;
    }

    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      return;
    }

    const generation = ++emailLookupGeneration.current;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/login-language?email=${encodeURIComponent(trimmed)}`,
        );
        if (!res.ok || generation !== emailLookupGeneration.current) {
          return;
        }
        const data = (await res.json()) as { language?: UiLanguage | null };
        if (
          !languagePinnedByUser.current &&
          (data.language === "en" || data.language === "he") &&
          generation === emailLookupGeneration.current
        ) {
          setLanguage(data.language);
          await persistLoginUiLanguage(data.language);
        }
      } catch {
        // ignore lookup failures
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [email, pinInitialLanguage]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");

    const emailToSubmit =
      (typeof emailValue === "string"
        ? emailValue
        : String(emailValue ?? "")
      ).trim();
    const passwordToSubmit =
      typeof passwordValue === "string"
        ? passwordValue
        : String(passwordValue ?? "");

    if (!emailToSubmit || !passwordToSubmit) {
      setError(copy.invalidCredentials);
      return;
    }

    setEmail(emailToSubmit);
    setPassword(passwordToSubmit);

    setLoading(true);
    try {
      await persistLoginUiLanguage(language);
      const result = await signIn("credentials", {
        email: emailToSubmit,
        password: passwordToSubmit,
        ui_language: language,
        redirect: false,
        callbackUrl: callbackUrl ?? "/",
      });

      if (result?.error) {
        setError(copy.invalidCredentials);
        setLoading(false);
        return;
      }

      window.location.href = result?.url ?? "/";
    } catch {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-950 px-4"
      dir={dir}
    >
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <div className="mb-4 flex items-center justify-end gap-1.5 text-xs">
          <span className="text-slate-500">{copy.languageLabel}</span>
          <button
            type="button"
            onClick={() => void applyLanguage("en", true)}
            className={
              language === "en"
                ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => void applyLanguage("he", true)}
            className={
              language === "he"
                ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          >
            עב
          </button>
        </div>
        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-50">
          {copy.title}
        </h1>
        <p className="mb-6 text-center text-sm text-slate-400">{copy.tagline}</p>
        {passwordUpdated ? (
          <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-200">
            {copy.passwordUpdated}
          </p>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              {copy.email}
            </label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={email}
              onChange={(e) => {
                if (!pinInitialLanguage) {
                  languagePinnedByUser.current = false;
                }
                setEmail(e.target.value);
              }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              {copy.password}
            </label>
            <PasswordInputWithToggle
              name="password"
              className="block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 shadow-sm outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-rose-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? copy.signingIn : copy.signIn}
          </button>
        </form>
      </div>
    </div>
  );
}
