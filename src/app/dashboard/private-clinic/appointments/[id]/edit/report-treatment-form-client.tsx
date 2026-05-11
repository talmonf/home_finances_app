"use client";

import { useMemo, useState } from "react";
import { TreatmentTravelSessionFields } from "../../../treatments/treatment-travel-session-fields";

type ClientOption = { id: string; label: string };

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  appointmentId: string;
  clients: ClientOption[];
  labels: {
    amount: string;
    currency: string;
    note1: string;
    client: string;
    additionalClients: string;
    addAdditionalClient: string;
    remove: string;
    submit: string;
    travel: {
      section: string;
      checkbox: string;
      amount: string;
      kmOptional: string;
      currencyHint: string;
    };
  };
};

export function ReportTreatmentFormClient({ action, appointmentId, clients, labels }: Props) {
  const [additionalParticipantIds, setAdditionalParticipantIds] = useState<string[]>([]);
  const selectedAdditionalIds = useMemo(
    () => new Set(additionalParticipantIds.filter(Boolean)),
    [additionalParticipantIds],
  );

  return (
    <form action={action} className="mt-3 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="appointment_id" value={appointmentId} />
      <input
        name="amount"
        placeholder={labels.amount}
        required
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <input
        name="currency"
        defaultValue="ILS"
        placeholder={labels.currency}
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      <textarea
        name="note_1"
        placeholder={labels.note1}
        className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 md:col-span-2"
      />
      <div className="space-y-2 md:col-span-2">
        <span className="block text-sm text-slate-300">{labels.additionalClients}</span>
        {additionalParticipantIds.map((clientId, index) => (
          <div key={`participant-${index}`} className="flex items-center gap-2">
            <select
              name="additional_participant_ids"
              value={clientId}
              onChange={(e) => {
                const next = [...additionalParticipantIds];
                next[index] = e.target.value;
                setAdditionalParticipantIds(next);
              }}
              className="flex-1 rounded-lg border border-slate-500 bg-slate-800 px-3 py-2 text-sm text-slate-100 shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="">{labels.client}</option>
              {clients.map((cl) => (
                <option
                  key={cl.id}
                  value={cl.id}
                  disabled={selectedAdditionalIds.has(cl.id) && cl.id !== clientId}
                >
                  {cl.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                setAdditionalParticipantIds((prev) =>
                  prev.filter((_, rowIndex) => rowIndex !== index),
                )
              }
              className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              {labels.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setAdditionalParticipantIds((prev) => [...prev, ""])}
          className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
        >
          {labels.addAdditionalClient}
        </button>
      </div>
      <TreatmentTravelSessionFields labels={labels.travel} />
      <button
        type="submit"
        className="w-fit rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
      >
        {labels.submit}
      </button>
    </form>
  );
}
