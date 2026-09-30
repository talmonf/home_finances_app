"use client";

import { useState } from "react";
import { generateTreatmentIntakeToken } from "./treatment-intake-actions";

type Labels = {
  title: string;
  intro: string;
  webhookUrl: string;
  noToken: string;
  tokenEnding: string | null;
  generate: string;
  rotate: string;
  rotateConfirm: string;
  copy: string;
  copied: string;
  tokenOnce: string;
};

export function TreatmentIntakeSection({
  webhookUrl,
  tokenLast4,
  revealedToken,
  labels,
}: {
  webhookUrl: string;
  tokenLast4: string | null;
  revealedToken: string | null;
  labels: Labels;
}) {
  const [copied, setCopied] = useState<"url" | "token" | null>(null);

  async function copy(kind: "url" | "token", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
      <h2 className="text-lg font-medium text-slate-200">{labels.title}</h2>
      <p className="mt-2 text-sm text-slate-400">{labels.intro}</p>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-slate-400" htmlFor="treatment-intake-url">
          {labels.webhookUrl}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="treatment-intake-url"
            readOnly
            value={webhookUrl}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => copy("url", webhookUrl)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
          >
            {copied === "url" ? labels.copied : labels.copy}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {tokenLast4 ? labels.tokenEnding : labels.noToken}
      </p>

      {revealedToken ? (
        <div className="mt-3 rounded-lg border border-amber-700/50 bg-amber-950/30 p-3">
          <p className="text-sm text-amber-100">{labels.tokenOnce}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={revealedToken}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 font-mono text-sm text-slate-100"
            />
            <button
              type="button"
              onClick={() => copy("token", revealedToken)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
            >
              {copied === "token" ? labels.copied : labels.copy}
            </button>
          </div>
        </div>
      ) : null}

      <form
        action={generateTreatmentIntakeToken}
        className="mt-4"
        onSubmit={(event) => {
          if (tokenLast4 && !window.confirm(labels.rotateConfirm)) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {tokenLast4 ? labels.rotate : labels.generate}
        </button>
      </form>
    </section>
  );
}
