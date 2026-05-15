"use client";

import { useMemo, useState } from "react";

type GoogleCalendarConnectionLabels = {
  accountConnected: string;
  accountNotConnected: string;
  connectAccount: string;
  reconnectAccount: string;
  gmailChangedReconnect: string;
  gmailPlaceholder: string;
};

type GoogleCalendarConnectionControlsProps = {
  googleConnected: boolean;
  initialGmailAddress: string;
  labels: GoogleCalendarConnectionLabels;
};

function normalizeGmailAddress(value: string): string {
  return value.trim().toLowerCase();
}

export function GoogleCalendarConnectionControls({
  googleConnected,
  initialGmailAddress,
  labels,
}: GoogleCalendarConnectionControlsProps) {
  const [gmailAddress, setGmailAddress] = useState(initialGmailAddress);
  const hasGmailChanged = useMemo(
    () => normalizeGmailAddress(gmailAddress) !== normalizeGmailAddress(initialGmailAddress),
    [gmailAddress, initialGmailAddress],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={
          googleConnected
            ? "rounded-md border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-xs font-medium text-emerald-100"
            : "rounded-md border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-100"
        }
      >
        {googleConnected ? labels.accountConnected : labels.accountNotConnected}
      </div>

      {!googleConnected || hasGmailChanged ? (
        <a
          href="/api/integrations/google/calendar/connect?returnTo=/dashboard/private-clinic/settings"
          className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
        >
          {googleConnected ? labels.reconnectAccount : labels.connectAccount}
        </a>
      ) : null}

      {googleConnected && hasGmailChanged ? (
        <span className="text-xs text-slate-400">{labels.gmailChangedReconnect}</span>
      ) : null}

      <input
        name="google_gmail_address"
        type="email"
        value={gmailAddress}
        onChange={(event) => setGmailAddress(event.target.value)}
        placeholder={labels.gmailPlaceholder}
        className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
      />
    </div>
  );
}
