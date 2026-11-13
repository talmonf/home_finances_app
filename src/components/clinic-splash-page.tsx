"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthLanguageToggle } from "@/components/auth-language-toggle";
import { clinicSplashCopy, type ClinicSplashCopy } from "@/lib/clinic-splash-copy";
import { clinicLoginHref } from "@/lib/clinic-splash-language";
import { PRIVACY_POLICY_PATH } from "@/lib/privacy-policy-content";
import { uiLanguageDirection, type UiLanguage } from "@/lib/ui-language";

function persistUiLanguage(language: UiLanguage) {
  return fetch("/api/auth/login-ui-language", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language }),
  });
}

function SplashActions({
  copy,
  onSignIn,
  onRequestAccess,
  onRequestDemo,
}: {
  copy: ClinicSplashCopy;
  onSignIn: () => void;
  onRequestAccess: () => void;
  onRequestDemo: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onSignIn}
        className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400"
      >
        {copy.signIn}
      </button>
      <button
        type="button"
        onClick={onRequestAccess}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-sky-200 ring-1 ring-sky-400/50 hover:bg-sky-500/10"
      >
        {copy.requestAccess}
      </button>
      <button
        type="button"
        onClick={onRequestDemo}
        className="rounded-lg px-4 py-2.5 text-sm font-semibold text-sky-200 ring-1 ring-sky-400/50 hover:bg-sky-500/10"
      >
        {copy.requestDemo}
      </button>
    </div>
  );
}

function SplashColumn({
  copy,
  dir,
  onSignIn,
  onRequestAccess,
  onRequestDemo,
}: {
  copy: ClinicSplashCopy;
  dir: "ltr" | "rtl";
  onSignIn: () => void;
  onRequestAccess: () => void;
  onRequestDemo: () => void;
}) {
  return (
    <section dir={dir} className="flex flex-col px-6 pb-10 pt-4 sm:px-10 lg:px-12 lg:pb-16 lg:pt-6">
      <p className="text-sm font-medium uppercase tracking-wide text-sky-300">{copy.kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-50 sm:text-4xl">{copy.productName}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">{copy.pitch}</p>
      <div className="mt-8">
        <SplashActions
          copy={copy}
          onSignIn={onSignIn}
          onRequestAccess={onRequestAccess}
          onRequestDemo={onRequestDemo}
        />
      </div>
      <div className="mt-10 flex flex-col gap-4">
        {copy.sections.map((section) => (
          <article key={section.id} className="rounded-2xl bg-slate-900/80 p-5 ring-1 ring-slate-800">
            <h2 className="text-lg font-semibold text-slate-50">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{section.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-10">
        <SplashActions
          copy={copy}
          onSignIn={onSignIn}
          onRequestAccess={onRequestAccess}
          onRequestDemo={onRequestDemo}
        />
      </div>
      <p className="mt-8 text-sm">
        <Link href={PRIVACY_POLICY_PATH} className="text-sky-300 hover:text-sky-200">
          {copy.privacyPolicy}
        </Link>
      </p>
    </section>
  );
}

export function ClinicSplashPage({ initialLanguage }: { initialLanguage: UiLanguage }) {
  const [language, setLanguage] = useState<UiLanguage>(initialLanguage);
  const languageRef = useRef(initialLanguage);
  const persistQueue = useRef(Promise.resolve());
  const [open, setOpen] = useState(false);
  const [requestKind, setRequestKind] = useState<"access" | "demo">("access");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorCode, setErrorCode] = useState<"invalid" | "unavailable" | "generic">("generic");

  languageRef.current = language;
  const copy = clinicSplashCopy(language);
  const dir = uiLanguageDirection(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    document.title = copy.productName;
  }, [language, dir, copy.productName]);

  function queueLanguagePersist(next: UiLanguage) {
    const job = persistQueue.current.then(async () => {
      try {
        await persistUiLanguage(next);
      } catch {
        // Sign-in still passes the chosen language on the login URL.
      }
    });
    persistQueue.current = job;
    return job;
  }

  function applyLanguage(next: UiLanguage) {
    languageRef.current = next;
    setLanguage(next);
    void queueLanguagePersist(next);
  }

  async function signIn() {
    const next = languageRef.current;
    await queueLanguagePersist(next);
    window.location.assign(clinicLoginHref(next));
  }

  function openForm(kind: "access" | "demo") {
    setRequestKind(kind);
    setStatus("idle");
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setWebsite("");
    setOpen(true);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/clinic/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: requestKind, name, email, phone, message, website }),
      });
      if (response.ok) {
        setStatus("sent");
        return;
      }
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorCode(data?.error === "invalid" || data?.error === "unavailable" ? data.error : "generic");
      setStatus("error");
    } catch {
      setErrorCode("generic");
      setStatus("error");
    }
  }

  const errorText =
    errorCode === "invalid"
      ? copy.errorInvalid
      : errorCode === "unavailable"
        ? copy.errorUnavailable
        : copy.errorGeneric;

  return (
    <div lang={language} dir={dir} className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
        <AuthLanguageToggle
          language={language}
          label={copy.languageLabel}
          onSelect={applyLanguage}
          className="px-6 pt-6 sm:px-10 lg:px-12"
        />
        <SplashColumn
          copy={copy}
          dir={dir}
          onSignIn={() => void signIn()}
          onRequestAccess={() => openForm("access")}
          onRequestDemo={() => openForm("demo")}
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div
            dir={dir}
            className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700"
            role="dialog"
            aria-labelledby="clinic-access-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="clinic-access-title" className="text-lg font-semibold text-slate-50">
                {requestKind === "demo" ? copy.demoFormTitle : copy.formTitle}
              </h2>
              <AuthLanguageToggle language={language} label={copy.languageLabel} onSelect={applyLanguage} />
            </div>
            {status === "sent" ? (
              <div>
                <p className="text-sm text-emerald-200">{copy.success}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {copy.close}
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void submitRequest(event)} className="flex flex-col gap-3">
                <p className="text-sm text-slate-400">
                  {requestKind === "demo" ? copy.demoFormIntro : copy.formIntro}
                </p>
                <label className="text-sm text-slate-200">
                  {copy.nameLabel}
                  <input
                    required
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  {copy.emailLabel}
                  <input
                    required
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  {copy.phoneLabel}
                  <input
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  {copy.messageLabel}
                  <textarea
                    name="message"
                    rows={3}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  name="website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className="absolute h-0 w-0 overflow-hidden opacity-0"
                />
                {status === "error" ? (
                  <p className="text-sm text-rose-300">{errorText}</p>
                ) : null}
                <div className="mt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
                  >
                    {status === "sending" ? copy.submitting : copy.submit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {copy.cancel}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
