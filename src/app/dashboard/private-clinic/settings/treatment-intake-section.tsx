"use client";

import { useState } from "react";
import { generateTreatmentIntakeToken } from "./treatment-intake-actions";

type Labels = {
  title: string;
  intro: string;
  webhookUrl: string;
  receiptWebhookUrl: string;
  noToken: string;
  tokenEnding: string | null;
  generate: string;
  rotate: string;
  rotateConfirm: string;
  copy: string;
  copied: string;
  tokenOnce: string;
  unlinked: string;
};

export function TreatmentIntakeSection({
  webhookUrl,
  receiptWebhookUrl,
  tokenLast4,
  revealedToken,
  linkedToFamilyMember,
  labels,
}: {
  webhookUrl: string;
  receiptWebhookUrl: string;
  tokenLast4: string | null;
  revealedToken: string | null;
  linkedToFamilyMember: boolean;
  labels: Labels;
}) {
  const [copied, setCopied] = useState<"treatment-url" | "receipt-url" | "token" | null>(null);

  async function copy(kind: "treatment-url" | "receipt-url" | "token", value: string) {
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

      <div className="mt-4 space-y-3">
        <UrlField
          id="treatment-intake-url"
          label={labels.webhookUrl}
          value={webhookUrl}
          copyLabel={copied === "treatment-url" ? labels.copied : labels.copy}
          onCopy={() => copy("treatment-url", webhookUrl)}
        />
        <UrlField
          id="receipt-intake-url"
          label={labels.receiptWebhookUrl}
          value={receiptWebhookUrl}
          copyLabel={copied === "receipt-url" ? labels.copied : labels.copy}
          onCopy={() => copy("receipt-url", receiptWebhookUrl)}
        />
      </div>

      <p className="mt-4 text-sm text-slate-300">
        {tokenLast4 ? labels.tokenEnding : labels.noToken}
      </p>

      {linkedToFamilyMember ? null : (
        <p className="mt-3 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {labels.unlinked}
        </p>
      )}

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

      {linkedToFamilyMember ? (
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
      ) : null}
    </section>
  );
}

function UrlField({
  id,
  label,
  value,
  copyLabel,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  copyLabel: string;
  onCopy: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400" htmlFor={id}>
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          readOnly
          value={value}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-2 text-sm text-slate-100"
        />
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
        >
          {copyLabel}
        </button>
      </div>
    </div>
  );
}
