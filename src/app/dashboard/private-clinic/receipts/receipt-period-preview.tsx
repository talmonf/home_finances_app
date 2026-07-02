"use client";

import { FilterCheckboxDropdown } from "@/components/filter-checkbox-dropdown";
import { LoadingSpinner } from "@/components/loading-spinner";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ReceiptPeriodPreviewEntryType,
  ReceiptPeriodPreviewResult,
  ReceiptPeriodPreviewRow,
  ReceiptPeriodPreviewTotals,
} from "@/lib/private-clinic/receipt-period-preview";

type FilterOption = { id: string; label: string };

export type ReceiptPeriodPreviewLabels = {
  title: string;
  idle: string;
  loading: string;
  error: string;
  empty: string;
  emptyFiltered: string;
  tableType: string;
  tableDate: string;
  tableProgram: string;
  tableVisitType: string;
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
  breakdownTemplate: string;
  suggestedMatchesGross: string;
  diffFromGrossTemplate: string;
  filterProgram: string;
  filterVisitType: string;
  filterAny: string;
  filterAnyF: string;
  filterSelectedCountTemplate: string;
  selectAll: string;
  deselectAll: string;
  filterDone: string;
  filterCloseHint: string;
};

function fillLabelTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), template);
}

type PreviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ReceiptPeriodPreviewResult };

type PreviewSortKey =
  | "entryType"
  | "occurredAtIso"
  | "programLabel"
  | "visitTypeLabel"
  | "clientLabel"
  | "amount";
type PreviewSortDir = "asc" | "desc";

function compareLocale(a: string, b: string): number {
  return a.localeCompare(b);
}

function decimalStringToNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function visitTypeLabelForRow(row: ReceiptPeriodPreviewRow, visitTypeLabels: Map<string, string>): string {
  if (!row.visitType) return "—";
  return visitTypeLabels.get(row.visitType) ?? row.visitType;
}

function filterRows(
  rows: ReceiptPeriodPreviewRow[],
  programIds: Set<string>,
  visitTypeIds: Set<string>,
): ReceiptPeriodPreviewRow[] {
  return rows.filter((row) => {
    if (programIds.size > 0 && (!row.programId || !programIds.has(row.programId))) return false;
    if (visitTypeIds.size > 0 && (!row.visitType || !visitTypeIds.has(row.visitType))) return false;
    return true;
  });
}

function computeTotals(rows: ReceiptPeriodPreviewRow[]): ReceiptPeriodPreviewTotals {
  let treatments = 0;
  let consultations = 0;
  let travel = 0;
  for (const row of rows) {
    const amount = decimalStringToNumber(row.amount);
    if (row.entryType === "treatment") treatments += amount;
    else if (row.entryType === "consultation") consultations += amount;
    else travel += amount;
  }
  return { treatments, consultations, travel, combined: treatments + consultations + travel };
}

function defaultSortRows(rows: ReceiptPeriodPreviewRow[]): ReceiptPeriodPreviewRow[] {
  return [...rows].sort((a, b) => {
    const dateCmp = compareLocale(a.occurredAtIso, b.occurredAtIso);
    if (dateCmp !== 0) return dateCmp;
    const programCmp = compareLocale(a.programLabel, b.programLabel);
    if (programCmp !== 0) return programCmp;
    return compareLocale(a.clientLabel, b.clientLabel);
  });
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

function tieBreakRows(a: ReceiptPeriodPreviewRow, b: ReceiptPeriodPreviewRow): number {
  const dateCmp = compareLocale(a.occurredAtIso, b.occurredAtIso);
  if (dateCmp !== 0) return dateCmp;
  const programCmp = compareLocale(a.programLabel, b.programLabel);
  if (programCmp !== 0) return programCmp;
  return compareLocale(a.clientLabel, b.clientLabel);
}

function sortValue(
  row: ReceiptPeriodPreviewRow,
  sortKey: PreviewSortKey,
  labels: ReceiptPeriodPreviewLabels,
  visitTypeLabels: Map<string, string>,
): number | string {
  if (sortKey === "entryType") return typeLabel(row.entryType, labels).toLocaleLowerCase();
  if (sortKey === "occurredAtIso") return row.occurredAtIso;
  if (sortKey === "programLabel") return row.programLabel.toLocaleLowerCase();
  if (sortKey === "visitTypeLabel") return visitTypeLabelForRow(row, visitTypeLabels).toLocaleLowerCase();
  if (sortKey === "clientLabel") return row.clientLabel.toLocaleLowerCase();
  return decimalStringToNumber(row.amount);
}

function sortRows(
  rows: ReceiptPeriodPreviewRow[],
  sortKey: PreviewSortKey,
  sortDir: PreviewSortDir,
  labels: ReceiptPeriodPreviewLabels,
  visitTypeLabels: Map<string, string>,
): ReceiptPeriodPreviewRow[] {
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = sortValue(a, sortKey, labels, visitTypeLabels);
    const bv = sortValue(b, sortKey, labels, visitTypeLabels);
    let primary = 0;
    if (typeof av === "number" && typeof bv === "number") {
      primary = av - bv;
    } else {
      primary = compareLocale(String(av), String(bv));
    }
    if (primary !== 0) return primary * direction;
    return tieBreakRows(a, b);
  });
}

export function ReceiptPeriodPreview({
  jobId,
  coveredPeriodStart,
  coveredPeriodEnd,
  grossAmount,
  currency,
  labels,
  programOptions,
  visitTypeOptions,
}: {
  jobId: string;
  coveredPeriodStart: string;
  coveredPeriodEnd: string;
  grossAmount: string;
  currency: string;
  labels: ReceiptPeriodPreviewLabels;
  programOptions: FilterOption[];
  visitTypeOptions: FilterOption[];
}) {
  const [state, setState] = useState<PreviewState>({ kind: "idle" });
  const [sortKey, setSortKey] = useState<PreviewSortKey | null>(null);
  const [sortDir, setSortDir] = useState<PreviewSortDir>("asc");
  const [programIds, setProgramIds] = useState<Set<string>>(() => new Set());
  const [visitTypeIds, setVisitTypeIds] = useState<Set<string>>(() => new Set());

  const visitTypeLabels = useMemo(
    () => new Map(visitTypeOptions.map((option) => [option.id, option.label])),
    [visitTypeOptions],
  );

  const validProgramIds = useMemo(() => new Set(programOptions.map((option) => option.id)), [programOptions]);
  const selectedProgramIds = useMemo(
    () => new Set([...programIds].filter((id) => validProgramIds.has(id))),
    [programIds, validProgramIds],
  );

  useEffect(() => {
    setSortKey(null);
    setSortDir("asc");
    setProgramIds(new Set());
    setVisitTypeIds(new Set());
  }, [coveredPeriodEnd, coveredPeriodStart, jobId]);

  useEffect(() => {
    setProgramIds((prev) => new Set([...prev].filter((id) => validProgramIds.has(id))));
  }, [validProgramIds]);

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

  const onSort = useCallback((column: PreviewSortKey) => {
    setSortKey((current) => {
      if (current === column) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDir("asc");
      return column;
    });
  }, []);

  const sortArrow = useCallback(
    (column: PreviewSortKey): string => {
      if (sortKey === null) {
        if (column === "occurredAtIso" || column === "programLabel" || column === "clientLabel") return " ▲";
        return "";
      }
      if (sortKey !== column) return "";
      return sortDir === "asc" ? " ▲" : " ▼";
    },
    [sortDir, sortKey],
  );

  const grossTotal = useMemo(() => decimalStringToNumber(grossAmount), [grossAmount]);
  const data = state.kind === "ready" ? state.data : null;
  const filteredRows = useMemo(() => {
    if (!data) return [];
    return filterRows(data.rows, selectedProgramIds, visitTypeIds);
  }, [data, selectedProgramIds, visitTypeIds]);
  const sortedRows = useMemo(() => {
    if (filteredRows.length === 0) return [];
    if (sortKey === null) return defaultSortRows(filteredRows);
    return sortRows(filteredRows, sortKey, sortDir, labels, visitTypeLabels);
  }, [filteredRows, labels, sortDir, sortKey, visitTypeLabels]);
  const filteredTotals = useMemo(() => computeTotals(filteredRows), [filteredRows]);
  const diffFromGross = filteredTotals.combined - grossTotal;
  const matchesGross = Math.abs(diffFromGross) < 0.005;
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
              <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
                <FilterCheckboxDropdown
                  name="preview_program"
                  label={labels.filterProgram}
                  anyLabel={labels.filterAnyF}
                  options={programOptions}
                  selectedIds={selectedProgramIds}
                  onChange={setProgramIds}
                  selectedCountTemplate={labels.filterSelectedCountTemplate}
                  selectAllLabel={labels.selectAll}
                  deselectAllLabel={labels.deselectAll}
                  doneLabel={labels.filterDone}
                  closeHint={labels.filterCloseHint}
                />
                <FilterCheckboxDropdown
                  name="preview_visit_type"
                  label={labels.filterVisitType}
                  anyLabel={labels.filterAny}
                  options={visitTypeOptions}
                  selectedIds={visitTypeIds}
                  onChange={setVisitTypeIds}
                  selectedCountTemplate={labels.filterSelectedCountTemplate}
                  selectAllLabel={labels.selectAll}
                  deselectAllLabel={labels.deselectAll}
                  doneLabel={labels.filterDone}
                  closeHint={labels.filterCloseHint}
                />
              </div>

              {sortedRows.length > 0 ? (
                <div className="overflow-x-auto rounded border border-slate-700/80">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-slate-900/70 text-left text-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-medium">
                          <button type="button" onClick={() => onSort("entryType")} className="hover:text-slate-100">
                            {labels.tableType}
                            {sortArrow("entryType")}
                          </button>
                        </th>
                        <th className="px-3 py-2 font-medium">
                          <button type="button" onClick={() => onSort("occurredAtIso")} className="hover:text-slate-100">
                            {labels.tableDate}
                            {sortArrow("occurredAtIso")}
                          </button>
                        </th>
                        <th className="px-3 py-2 font-medium">
                          <button type="button" onClick={() => onSort("programLabel")} className="hover:text-slate-100">
                            {labels.tableProgram}
                            {sortArrow("programLabel")}
                          </button>
                        </th>
                        <th className="px-3 py-2 font-medium">
                          <button type="button" onClick={() => onSort("visitTypeLabel")} className="hover:text-slate-100">
                            {labels.tableVisitType}
                            {sortArrow("visitTypeLabel")}
                          </button>
                        </th>
                        <th className="px-3 py-2 font-medium">
                          <button type="button" onClick={() => onSort("clientLabel")} className="hover:text-slate-100">
                            {labels.tableClient}
                            {sortArrow("clientLabel")}
                          </button>
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          <button type="button" onClick={() => onSort("amount")} className="hover:text-slate-100">
                            {labels.tableAmount}
                            {sortArrow("amount")}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr key={`${row.entryType}-${row.id}`} className="border-t border-slate-800">
                          <td className="px-3 py-2">{typeLabel(row.entryType, labels)}</td>
                          <td className="px-3 py-2">{row.occurredAtIso}</td>
                          <td className="px-3 py-2">{row.programLabel}</td>
                          <td className="px-3 py-2">{visitTypeLabelForRow(row, visitTypeLabels)}</td>
                          <td className="px-3 py-2">{row.clientLabel}</td>
                          <td className="px-3 py-2 text-right">
                            {Number(row.amount).toFixed(2)} {row.currency}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                        <td className="px-3 py-2 font-medium" colSpan={5}>
                          {labels.subtotalTreatments}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {filteredTotals.treatments.toFixed(2)} {tableCurrency}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                        <td className="px-3 py-2 font-medium" colSpan={5}>
                          {labels.subtotalConsultations}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {filteredTotals.consultations.toFixed(2)} {tableCurrency}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-700 bg-slate-900/60 text-slate-200">
                        <td className="px-3 py-2 font-medium" colSpan={5}>
                          {labels.subtotalTravel}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {filteredTotals.travel.toFixed(2)} {tableCurrency}
                        </td>
                      </tr>
                      <tr className="border-t border-slate-600 bg-slate-900/80 text-slate-100">
                        <td className="px-3 py-2 font-semibold" colSpan={5}>
                          {labels.suggestedCombinedTotal}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {filteredTotals.combined.toFixed(2)} {tableCurrency}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400">{labels.emptyFiltered}</p>
              )}

              {sortedRows.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-slate-400">
                    {fillLabelTemplate(labels.breakdownTemplate, {
                      treatments: filteredTotals.treatments.toFixed(2),
                      consultations: filteredTotals.consultations.toFixed(2),
                      travel: filteredTotals.travel.toFixed(2),
                    })}
                  </p>
                  {matchesGross ? (
                    <p className="text-emerald-300">{labels.suggestedMatchesGross}</p>
                  ) : (
                    <p className="text-amber-300">
                      {fillLabelTemplate(labels.diffFromGrossTemplate, {
                        diff: diffFromGross.toFixed(2),
                        currency: tableCurrency,
                      })}
                    </p>
                  )}
                  {data.truncated ? <p className="text-slate-500">{labels.truncated}</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-slate-400">{labels.empty}</p>
          )
        ) : null}
      </div>
    </div>
  );
}
