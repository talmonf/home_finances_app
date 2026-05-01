"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatHouseholdDateUtcWithOptionalTime } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { formatClientNameForDisplay, formatMoneyLineForDisplay } from "@/lib/privacy-display";
import type { UiLanguage } from "@/lib/ui-language";

type SortKey = "occurred_at" | "type" | "job" | "amount";
type SortDir = "asc" | "desc";

export type TravelListRowDto = {
  id: string;
  occurred_at_iso: string | null;
  scope: "job" | "treatment";
  client_first_name: string | null;
  client_last_name: string | null;
  job_label: string | null;
  amount: string | null;
  currency: string;
  linked_receipt_id: string | null;
  linked_receipt_number: string | null;
};

type Labels = {
  when: string;
  type: string;
  job: string;
  amount: string;
  receipt: string;
  edit: string;
  scopeTreatment: string;
  scopeJob: string;
  linked: string;
  unlinked: string;
  noDate: string;
};

function amountValue(text: string | null): number {
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function TravelListClient({
  rows,
  listBaseHref,
  dateDisplayFormat,
  uiLanguage,
  obfuscate,
  labels,
}: {
  rows: TravelListRowDto[];
  listBaseHref: string;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
  obfuscate: boolean;
  labels: Labels;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("occurred_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = useCallback((column: SortKey) => {
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
    (column: SortKey): string => {
      if (sortKey !== column) return "";
      return sortDir === "asc" ? " ▲" : " ▼";
    },
    [sortDir, sortKey],
  );

  const sortedRows = useMemo(() => {
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      if (sortKey === "occurred_at") {
        aValue = a.occurred_at_iso ? new Date(a.occurred_at_iso).getTime() : 0;
        bValue = b.occurred_at_iso ? new Date(b.occurred_at_iso).getTime() : 0;
      } else if (sortKey === "type") {
        aValue = a.scope;
        bValue = b.scope;
      } else if (sortKey === "job") {
        aValue = (a.job_label ?? "").toLocaleLowerCase();
        bValue = (b.job_label ?? "").toLocaleLowerCase();
      } else {
        aValue = amountValue(a.amount);
        bValue = amountValue(b.amount);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [rows, sortDir, sortKey]);

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80">
            <th className="px-3 py-2 text-slate-300">
              <button type="button" onClick={() => onSort("occurred_at")} className="hover:text-slate-100">
                {labels.when}
                {sortArrow("occurred_at")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">
              <button type="button" onClick={() => onSort("type")} className="hover:text-slate-100">
                {labels.type}
                {sortArrow("type")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">
              <button type="button" onClick={() => onSort("job")} className="hover:text-slate-100">
                {labels.job}
                {sortArrow("job")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">
              <button type="button" onClick={() => onSort("amount")} className="hover:text-slate-100">
                {labels.amount}
                {sortArrow("amount")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">{labels.receipt}</th>
            <th className="px-3 py-2 text-slate-300">{labels.edit}</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id} className="border-b border-slate-700/80">
              <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                {row.occurred_at_iso
                  ? formatHouseholdDateUtcWithOptionalTime(new Date(row.occurred_at_iso), dateDisplayFormat)
                  : labels.noDate}
              </td>
              <td className="px-3 py-2 text-slate-300">
                {row.scope === "treatment"
                  ? `${labels.scopeTreatment} ${formatClientNameForDisplay(obfuscate, row.client_first_name ?? "", row.client_last_name)}`
                  : labels.scopeJob}
              </td>
              <td className="px-3 py-2 text-slate-400">{row.job_label ?? "—"}</td>
              <td className="px-3 py-2 text-slate-300">
                {row.amount ? formatMoneyLineForDisplay(obfuscate, row.amount, row.currency, uiLanguage) : "—"}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {row.linked_receipt_id && row.linked_receipt_number ? (
                  <Link
                    href={`/dashboard/private-clinic/receipts/${encodeURIComponent(row.linked_receipt_id)}`}
                    className="text-sky-400 hover:underline"
                  >
                    #{row.linked_receipt_number}
                  </Link>
                ) : (
                  labels.unlinked
                )}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`${listBaseHref}${listBaseHref.includes("?") ? "&" : "?"}modal=edit&edit_id=${encodeURIComponent(row.id)}`}
                  className="text-xs text-sky-400 hover:underline"
                >
                  {labels.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
