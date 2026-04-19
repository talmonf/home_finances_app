"use client";

import { useMemo, useState } from "react";
import { TherapyTreatmentDefaultAmountFields } from "@/components/therapy-treatment-default-amount-fields";

type JobOption = { id: string; label: string };
type ProgramOption = { id: string; job_id: string; label: string };
type ClientOption = {
  id: string;
  label: string;
  default_job_id: string;
  default_program_id: string | null;
  default_visit_type: "clinic" | "home" | "phone" | "video" | null;
};
type VisitDefaultOption = {
  job_id: string;
  program_id: string | null;
  visit_type: "clinic" | "home" | "phone" | "video";
  amount: string;
  currency: string;
};

type SectionLabels = {
  client: string;
  job: string;
  program: string;
  date: string;
  amount: string;
  currency: string;
  select: string;
  occurredTimeOptional: string;
  visitType: string;
};

export function TreatmentClientDefaultsSection({
  mode,
  uiLanguage,
  clients,
  jobs,
  programs,
  visitDefaults,
  initial,
  labels,
}: {
  mode: "create" | "edit";
  uiLanguage: "en" | "he";
  clients: ClientOption[];
  jobs: JobOption[];
  programs: ProgramOption[];
  visitDefaults: VisitDefaultOption[];
  initial?: {
    client_id?: string;
    client_label?: string;
    job_id?: string;
    program_id?: string;
    occurred_date?: string;
    occurred_time?: string;
    amount?: string;
    currency?: string;
    visit_type?: "clinic" | "home" | "phone" | "video";
  };
  labels: SectionLabels;
}) {
  const [selectedClientId, setSelectedClientId] = useState(initial?.client_id ?? "");
  const selectedClientDefaults = useMemo(
    () => clients.find((cl) => cl.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  return (
    <>
      {mode === "create" ? (
        <div>
          <label className="block text-xs text-slate-400">{labels.client}</label>
          <select
            name="client_id"
            required
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">{labels.select}</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id}>
                {cl.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs text-slate-400">{labels.client}</label>
          <div className="mt-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100">
            {initial?.client_label || "—"}
          </div>
        </div>
      )}

      <TherapyTreatmentDefaultAmountFields
        key={`${mode}-${selectedClientDefaults?.id ?? "none"}`}
        uiLanguage={uiLanguage}
        jobs={jobs.map((j) => ({ id: j.id, job_title: j.label }))}
        programs={programs.map((p) => ({
          id: p.id,
          job_id: p.job_id,
          name: p.label,
          job: { job_title: jobs.find((j) => j.id === p.job_id)?.label ?? "" },
        }))}
        visitDefaults={visitDefaults}
        clients={clients}
        defaultClientId={selectedClientDefaults?.id ?? ""}
        labels={{
          job: labels.job,
          program: labels.program,
          date: labels.date,
          timeOptional: labels.occurredTimeOptional,
          amount: labels.amount,
          currency: labels.currency,
          visitType: labels.visitType,
          select: labels.select,
        }}
        defaultValues={{
          job_id: initial?.job_id ?? "",
          program_id: initial?.program_id ?? "",
          occurred_date: initial?.occurred_date ?? "",
          occurred_time: initial?.occurred_time ?? "",
          amount: initial?.amount ?? "",
          currency: initial?.currency ?? "ILS",
          ...(initial?.visit_type !== undefined ? { visit_type: initial.visit_type } : {}),
        }}
      />
    </>
  );
}
