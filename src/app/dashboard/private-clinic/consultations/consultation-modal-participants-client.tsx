"use client";

import { useMemo, useState } from "react";

type ClientOption = { id: string; label: string };

type Props = {
  clients: ClientOption[];
  labels: {
    clients: string;
    selectClientPlaceholder: string;
    addAdditionalClient: string;
    remove: string;
  };
  initialParticipantIds: string[];
};

function initialRows(ids: string[]): string[] {
  return ids.length > 0 ? [...ids] : [""];
}

export function ConsultationModalParticipantsPicker({ clients, labels, initialParticipantIds }: Props) {
  const [participantIds, setParticipantIds] = useState<string[]>(() => initialRows(initialParticipantIds));
  const selectedIds = useMemo(() => new Set(participantIds.filter(Boolean)), [participantIds]);

  return (
    <div className="md:col-span-2">
      <span className="block text-xs text-slate-400">{labels.clients}</span>
      <div className="mt-2 space-y-2">
        {participantIds.map((clientId, index) => (
          <div key={`consultation-client-${index}`} className="flex items-center gap-2">
            <select
              name="additional_participant_ids"
              value={clientId}
              onChange={(e) => {
                const next = [...participantIds];
                next[index] = e.target.value;
                setParticipantIds(next);
              }}
              className="w-full max-w-sm rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">{labels.selectClientPlaceholder}</option>
              {clients.map((cl) => (
                <option key={cl.id} value={cl.id} disabled={selectedIds.has(cl.id) && cl.id !== clientId}>
                  {cl.label}
                </option>
              ))}
            </select>
            {participantIds.length > 1 ? (
              <button
                type="button"
                onClick={() => setParticipantIds((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
              >
                {labels.remove}
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setParticipantIds((prev) => [...prev, ""])}
          className="text-sm text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline"
        >
          {labels.addAdditionalClient}
        </button>
      </div>
    </div>
  );
}
