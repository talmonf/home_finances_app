"use client";

import { useState, type FormEvent } from "react";
import { clinicSplashCopy, type ClinicSplashCopy } from "@/lib/clinic-splash-copy";
import { clinicLoginHref, uiLanguageFromBrowser } from "@/lib/clinic-splash-language";
import { uiLanguageDirection, type UiLanguage } from "@/lib/ui-language";

function browserLanguage(): UiLanguage {
  if (typeof navigator === "undefined") return "he";
  return uiLanguageFromBrowser(navigator.language);
}

function SplashColumn({
  copy,
  dir,
  onSignIn,
  onRequestAccess,
}: {
  copy: ClinicSplashCopy;
  dir: "ltr" | "rtl";
  onSignIn: () => void;
  onRequestAccess: () => void;
}) {
  return (
    <section dir={dir} className="flex flex-col px-6 py-10 sm:px-10 lg:px-12 lg:py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-sky-300">{copy.kicker}</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-50 sm:text-4xl">{copy.productName}</h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">{copy.pitch}</p>
      <ul className="mt-8 flex flex-col gap-5">
        {copy.features.map((feature) => (
          <li key={feature.title}>
            <p className="font-medium text-slate-50">{feature.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{feature.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
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
      </div>
    </section>
  );
}

export function ClinicSplashPage() {
  const english = clinicSplashCopy("en");
  const hebrew = clinicSplashCopy("he");
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<UiLanguage>("he");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorCode, setErrorCode] = useState<"invalid" | "unavailable" | "generic">("generic");

  const formCopy = clinicSplashCopy(language);
  const formDir = uiLanguageDirection(language);

  function signIn() {
    window.location.href = clinicLoginHref(browserLanguage());
  }

  function openRequest() {
    setLanguage(browserLanguage());
    setStatus("idle");
    setOpen(true);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/clinic/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, website }),
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
      ? formCopy.errorInvalid
      : errorCode === "unavailable"
        ? formCopy.errorUnavailable
        : formCopy.errorGeneric;

  return (
    <div dir="ltr" className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto grid min-h-screen max-w-screen-2xl lg:grid-cols-2">
        <div className="order-2 border-slate-800 lg:order-1 lg:border-e">
          <SplashColumn
            copy={english}
            dir="ltr"
            onSignIn={signIn}
            onRequestAccess={openRequest}
          />
        </div>
        <div className="order-1 lg:order-2">
          <SplashColumn
            copy={hebrew}
            dir="rtl"
            onSignIn={signIn}
            onRequestAccess={openRequest}
          />
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div
            dir={formDir}
            className="w-full max-w-md rounded-2xl bg-slate-900 p-6 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700"
            role="dialog"
            aria-labelledby="clinic-access-title"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 id="clinic-access-title" className="text-lg font-semibold text-slate-50">
                {formCopy.formTitle}
              </h2>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">{formCopy.languageLabel}</span>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={
                    language === "en"
                      ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                      : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800"
                  }
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("he")}
                  className={
                    language === "he"
                      ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                      : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800"
                  }
                >
                  עב
                </button>
              </div>
            </div>
            {status === "sent" ? (
              <div>
                <p className="text-sm text-emerald-200">{formCopy.success}</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
                >
                  {formCopy.close}
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void submitRequest(event)} className="flex flex-col gap-3">
                <p className="text-sm text-slate-400">{formCopy.formIntro}</p>
                <label className="text-sm text-slate-200">
                  {formCopy.nameLabel}
                  <input
                    required
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  {formCopy.emailLabel}
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
                  {formCopy.phoneLabel}
                  <input
                    name="phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-50 outline-none focus:border-sky-500"
                  />
                </label>
                <label className="text-sm text-slate-200">
                  {formCopy.messageLabel}
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
                    {status === "sending" ? formCopy.submitting : formCopy.submit}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    {formCopy.cancel}
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
