"use client";

import { useMemo, useState } from "react";

type JobOption = { id: string; label: string };

type MorningIntegrationLabels = {
  title: string;
  intro: string;
  guideTitle: string;
  guideIntro: string;
  guideSteps: string[];
  guideDocsLink: string;
  job: string;
  environment: string;
  sandbox: string;
  production: string;
  enabled: string;
  apiKeyId: string;
  apiSecret: string;
  apiSecretPlaceholder: string;
  save: string;
  testConnection: string;
  testHint: string;
  testRequiresCredentials: string;
  disconnect: string;
  connected: string;
  notConnected: string;
  businessName: string;
  businessTaxId: string;
  documentType: string;
  lastError: string;
  lastTested: string;
  receiptNumberingMode: string;
  receiptNumberingManual: string;
  receiptNumberingAuto: string;
  receiptNumberingAsk: string;
  receiptNumberingHint: string;
};

export type MorningIntegrationInitial = {
  jobId: string;
  enabled: boolean;
  environment: "sandbox" | "production";
  hasCredentials: boolean;
  maskedApiKeyId: string | null;
  businessName: string | null;
  businessTaxId: string | null;
  defaultDocumentType: number;
  lastTestedAt: string | null;
  lastError: string | null;
  receiptNumberingMode: "manual" | "morning_auto" | "ask_each_time";
};

const MORNING_DOCS_URL = "https://developers.morning.co/";

export function MorningIntegrationSection({
  jobs,
  integrationsByJobId,
  labels,
  saveAction,
  testAction,
  disconnectAction,
  initialJobId,
}: {
  jobs: JobOption[];
  integrationsByJobId: Record<string, MorningIntegrationInitial>;
  labels: MorningIntegrationLabels;
  saveAction: (formData: FormData) => void | Promise<void>;
  testAction: (formData: FormData) => void | Promise<void>;
  disconnectAction: (formData: FormData) => void | Promise<void>;
  initialJobId?: string;
}) {
  const defaultJobId = initialJobId && jobs.some((j) => j.id === initialJobId)
    ? initialJobId
    : jobs[0]?.id ?? "";
  const [jobId, setJobId] = useState(defaultJobId);
  const [apiKeyId, setApiKeyId] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const integration = useMemo(
    () => (jobId ? integrationsByJobId[jobId] : undefined),
    [integrationsByJobId, jobId],
  );

  const canTest = Boolean(
    (apiKeyId.trim() && apiSecret.trim()) || integration?.hasCredentials,
  );

  const isConnected = Boolean(
    integration?.hasCredentials && integration.businessName && !integration.lastError,
  );

  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 sm:p-6">
      <h2 className="text-lg font-medium text-slate-200">{labels.title}</h2>
      <p className="mt-2 text-sm text-slate-400">{labels.intro}</p>

      <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:p-4" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          {labels.guideTitle}
        </summary>
        <p className="mt-3 text-sm text-slate-400">{labels.guideIntro}</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          {labels.guideSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          <a
            href={MORNING_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300"
          >
            {labels.guideDocsLink} →
          </a>
        </p>
      </details>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-slate-400">{labels.job}</label>
          <select
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setApiKeyId("");
              setApiSecret("");
            }}
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </div>

        <div
          className={
            isConnected
              ? "inline-flex rounded-md border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-100"
              : "inline-flex rounded-md border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100"
          }
        >
          {isConnected ? labels.connected : labels.notConnected}
        </div>

        {integration?.businessName ? (
          <dl className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">{labels.businessName}</dt>
              <dd>{integration.businessName}</dd>
            </div>
            {integration.businessTaxId ? (
              <div>
                <dt className="text-xs text-slate-500">{labels.businessTaxId}</dt>
                <dd>{integration.businessTaxId}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-slate-500">{labels.documentType}</dt>
              <dd>{integration.defaultDocumentType} (קבלה)</dd>
            </div>
            {integration.lastTestedAt ? (
              <div>
                <dt className="text-xs text-slate-500">{labels.lastTested}</dt>
                <dd>{integration.lastTestedAt}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {integration?.lastError ? (
          <p className="rounded-md border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-100">
            {labels.lastError}: {integration.lastError}
          </p>
        ) : null}

        <form
          key={jobId}
          action={saveAction}
          className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3"
        >
          <input type="hidden" name="job_id" value={jobId} />
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              name="enabled"
              value="1"
              defaultChecked={integration?.enabled ?? false}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500"
            />
            {labels.enabled}
          </label>

          <div>
            <label className="mb-1 block text-xs text-slate-400">{labels.receiptNumberingMode}</label>
            <select
              name="receipt_numbering_mode"
              defaultValue={integration?.receiptNumberingMode ?? "ask_each_time"}
              className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="ask_each_time">{labels.receiptNumberingAsk}</option>
              <option value="morning_auto">{labels.receiptNumberingAuto}</option>
              <option value="manual">{labels.receiptNumberingManual}</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">{labels.receiptNumberingHint}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-slate-400">{labels.environment}</legend>
            <label className="mr-4 inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                name="environment"
                value="sandbox"
                defaultChecked={(integration?.environment ?? "sandbox") === "sandbox"}
              />
              {labels.sandbox}
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-200">
              <input
                type="radio"
                name="environment"
                value="production"
                defaultChecked={integration?.environment === "production"}
              />
              {labels.production}
            </label>
          </fieldset>

          <div>
            <label className="mb-1 block text-xs text-slate-400">{labels.apiKeyId}</label>
            <input
              name="api_key_id"
              type="text"
              autoComplete="off"
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              placeholder={integration?.maskedApiKeyId ?? ""}
              className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">{labels.apiSecret}</label>
            <input
              name="api_secret"
              type="password"
              autoComplete="new-password"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              placeholder={integration?.hasCredentials ? labels.apiSecretPlaceholder : ""}
              className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              {labels.save}
            </button>
            <button
              type="submit"
              formAction={testAction}
              disabled={!canTest}
              className="inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-950/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.testConnection}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            {canTest ? labels.testHint : labels.testRequiresCredentials}
          </p>
        </form>

        {integration?.hasCredentials ? (
          <form action={disconnectAction}>
            <input type="hidden" name="job_id" value={jobId} />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg border border-rose-800/60 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/40"
            >
              {labels.disconnect}
            </button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
