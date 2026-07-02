"use client";

import { LoadingSpinner } from "@/components/loading-spinner";
import { useEffect, useMemo, useState } from "react";
import type { ReceiptPeriodPreviewEntryType, ReceiptPeriodPreviewResult } from "@/lib/private-clinic/receipt-period-preview";

export type ReceiptPeriodPreviewLabels = {
  title: string;
  idle: string;
  loading: string;
  error: string;
  empty: string;
  tableType: string;
  tableDate: string;
  tableClient: string;
  tableAmount: string;
  treatmentType: string;
  consultationType: string;
  travelType: string;
  subtotalTreatments: string;
  subtotalConsultations: string;
  subtotalTravel: string;
  truncated: string;
  suggestedCombinedTotal: string;
  suggestedTotalsBreakdown: (treatments: string, consultations: string, travel: string) => string;
  suggestedMatchesGross: string;
  suggestedDiffFromGross: (diff: string, currency: string) => string;
};

type PreviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ReceiptPeriodPreviewResult };

function decimalStringToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function typeLabel(type: ReceiptPeriodPreviewEntryType, labels: ReceiptPeriodPreviewLabels): string {
  switch (type) {
    case "treatment":
      return labels.treatmentType;
    case "consultation":
      return labels.consultationType;
    default:
      return labels.travelType;
  }
}

export function ReceiptPeriodPreview({
  jobId,
  coveredPeriodStart,
  coveredPeriodEnd,
  grossAmount,
  currency,
  labels,
}: {
  jobId: string;
  coveredPeriodStart: string;
  coveredPeriodEnd: string;
  grossAmount: string;
  currency: string;
  labels: ReceiptPeriodPreviewLabels;
}) {
  const [state, setState] = useState<PreviewState>({ kind: "idle" });

  useEffect(() => {
    if (!jobId || !coveredPeriodStart || !coveredPeriodEnd) {
      setState({ kind: "idle" });
      return;
    }

    const controller = new AbortController();
    setState({ kind: "loading" });
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          jobId,
          from: coveredPeriodStart,
          to: coveredPeriodEnd,
        });
        const res = await fetch(`/api/private-clinic/receipts/period-preview?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await res.json()) as ReceiptPeriodPreviewResult | { error?: string };
        if (!res.ok) {
          throw new Error("error" in data && typeof data.error === "string" ? data.error : labels.error);
        }
        setState({ kind: "ready", data: data as ReceiptPeriodPreviewResult });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message: error instanceof Error && error.message ? error.message : labels.error,
        });
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [coveredPeriodEnd, coveredPeriodStart, jobId, labels.error]);

  const grossTotal = useMemo(() => decimalStringToNumber(grossAmount), [grossAmount]);
  const data = state.kind === "ready" ? state.data : null;
  const diffFromGross = data ? data.totals.combined - grossTotal : 0;
  const matchesGross = data ? Math.abs(diffFromGross) < 0.005 : false;
  const tableCurrency = currency || data?.rows[0]?.currency || "ILS";

  return (
    <div className="md:col-span-2 rounded border border-slate-700/80 bg-slate-950/50 p-3 text-xs text-slate-300">
      <div className="space-y-3">
        <div>
          <p className="font-medium text-slate-100">{labels.title}</p>
          {state.kind === "idle" ? <p className="mt-1 text-slate-400">{labels.idle}</p> : null}
          {state.kind === "loading" ? (
            <p className="mt-1 inline-flex items-center gap-2 text-slate-400">
              <LoadingSpinner className="h-3.5 w-3.5" />
              <span>{labels.loading}</span>
            </p>
          ) : null}
          {state.kind === "error" ? <p className="mt-1 text-rose-300">{state.message || labels.error}</p> : null}
        </div>

        {data ? (
          data.rows.length > 0 ? (
            <>
              <div className="overflow-x-auto rounded border border-slate-700/80">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-900/70 text-left text-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">{labels.tableType}</th>
                      <th className="px-3 py-2 font-medium">{labels.tableDate}</th>
                      <th className="px-3 py-2 font-medium">{labels.tableClient}</th>
                      <th className="px-3 py-2 text-right font-medium">{labels.tableAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={`${row.entryType}-${row.id}`} className="border-t border-slate-800">
                        <td className="px-3 py-2">{typeLabel(row.entryType, labels)}</td>
                        <td className="px-3 py-2">{row.occurredAtIso}</td>
                        <td className="px-3 py-2">{row.clientLabel}</td>
                        <td className="px-3 py-2 text-right">
                          {Number(row.amount).toFixed(2)} {row.currency}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                      <td className="px-3 py-2 font-medium" colSpan={3}>
                        {labels.subtotalTreatments}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {data.totals.treatments.toFixed(2)} {tableCurrency}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                      <td className="px-3 py-2 font-medium" colSpan={3}>
                        {labels.subtotalConsultations}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {data.totals.consultations.toFixed(2)} {tableCurrency}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                      <td className="px-3 py-2 font-medium" colSpan={3}>
                        {labels.subtotalTravel}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {data.totals.travel.toFixed(2)} {tableCurrency}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-600 bg-slate-900/80 text-slate-100">
                      <td className="px-3 py-2 font-semibold" colSpan={3}>
                        {labels.suggestedCombinedTotal}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {data.totals.combined.toFixed(2)} {tableCurrency}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-1">
                <p className="text-slate-400">
                  {labels.suggestedTotalsBreakdown(
                    data.totals.treatments.toFixed(2),
                    data.totals.consultations.toFixed(2),
                    data.totals.travel.toFixed(2),
                  )}
                </p>
                {matchesGross ? (
                  <p className="text-emerald-300">{labels.suggestedMatchesGross}</p>
                ) : (
                  <p className="text-amber-300">{labels.suggestedDiffFromGross(diffFromGross.toFixed(2), tableCurrency)}</p>
                )}
                {data.truncated ? <p className="text-slate-500">{labels.truncated}</p> : null}
              </div>
            </>
          ) : (
            <p className="text-slate-400">{labels.empty}</p>
          )
        ) : null}
      </div>
    </div>
  );
}
