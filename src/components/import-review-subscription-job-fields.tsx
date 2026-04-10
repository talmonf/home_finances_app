"use client";

import { useState } from "react";

const selectClass =
  "min-w-[160px] rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100";

export type ImportReviewSubscriptionOption = {
  id: string;
  name: string;
  jobId: string | null;
};

export function ImportReviewSubscriptionJobFields({
  subscriptions,
  jobs,
  initialSubscriptionId,
  initialJobId,
  subscriptionPlaceholder,
  jobPlaceholder,
}: {
  subscriptions: ImportReviewSubscriptionOption[];
  jobs: { id: string; label: string }[];
  initialSubscriptionId: string;
  initialJobId: string;
  subscriptionPlaceholder: string;
  jobPlaceholder: string;
}) {
  const [subscriptionId, setSubscriptionId] = useState(initialSubscriptionId);
  const [jobId, setJobId] = useState(initialJobId);

  const jobBySubId = new Map(subscriptions.map((s) => [s.id, s.jobId]));

  return (
    <>
      <select
        name="subscription_id"
        value={subscriptionId}
        onChange={(e) => {
          const v = e.target.value;
          setSubscriptionId(v);
          const linked = v ? jobBySubId.get(v) : undefined;
          setJobId(linked ?? "");
        }}
        className={selectClass}
      >
        <option value="">{subscriptionPlaceholder}</option>
        {subscriptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        name="job_id"
        value={jobId}
        onChange={(e) => setJobId(e.target.value)}
        className={selectClass}
      >
        <option value="">{jobPlaceholder}</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.label}
          </option>
        ))}
      </select>
    </>
  );
}
