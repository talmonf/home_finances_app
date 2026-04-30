"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatHouseholdDateUtcWithOptionalTime } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import type { UiLanguage } from "@/lib/ui-language";
import type { ConsultationListRowDto } from "./consultations-list-data";

type ColumnSortKey = "occurred_at" | "type" | "job" | "income_amount" | "cost_amount";
type SortDir = "asc" | "desc";

type Labels = {
  when: string;
  type: string;
  job: string;
  income: string;
  cost: string;
  linkedIncome: string;
  linkedCost: string;
  edit: string;
  linked: string;
  unlinked: string;
};

function amountValue(text: string | null): number {
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ConsultationsListClient({
  rows,
  listBaseHref,
  labels,
  uiLanguage,
  dateDisplayFormat,
}: {
  rows: ConsultationListRowDto[];
  listBaseHref: string;
  labels: Labels;
  uiLanguage: UiLanguage;
  dateDisplayFormat: HouseholdDateDisplayFormat;
}) {
  const [sortKey, setSortKey] = useState<ColumnSortKey>("occurred_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const onSort = useCallback((column: ColumnSortKey) => {
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
    (column: ColumnSortKey): string => {
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
        aValue = new Date(a.occurred_at_iso).getTime();
        bValue = new Date(b.occurred_at_iso).getTime();
      } else if (sortKey === "type") {
        aValue = therapyLocalizedCategoryName(
          { name: a.consultation_type_name, name_he: a.consultation_type_name_he },
          uiLanguage,
        ).toLocaleLowerCase();
        bValue = therapyLocalizedCategoryName(
          { name: b.consultation_type_name, name_he: b.consultation_type_name_he },
          uiLanguage,
        ).toLocaleLowerCase();
      } else if (sortKey === "job") {
        aValue = a.job_label.toLocaleLowerCase();
        bValue = b.job_label.toLocaleLowerCase();
      } else if (sortKey === "income_amount") {
        aValue = amountValue(a.income_amount);
        bValue = amountValue(b.income_amount);
      } else {
        aValue = amountValue(a.cost_amount);
        bValue = amountValue(b.cost_amount);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [rows, sortDir, sortKey, uiLanguage]);

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
              <button type="button" onClick={() => onSort("income_amount")} className="hover:text-slate-100">
                {labels.income}
                {sortArrow("income_amount")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">
              <button type="button" onClick={() => onSort("cost_amount")} className="hover:text-slate-100">
                {labels.cost}
                {sortArrow("cost_amount")}
              </button>
            </th>
            <th className="px-3 py-2 text-slate-300">{labels.linkedIncome}</th>
            <th className="px-3 py-2 text-slate-300">{labels.linkedCost}</th>
            <th className="px-3 py-2 text-slate-300">{labels.edit}</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id} className="border-b border-slate-700/80">
              <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                {formatHouseholdDateUtcWithOptionalTime(new Date(row.occurred_at_iso), dateDisplayFormat)}
              </td>
              <td className="px-3 py-2 text-slate-100">
                {therapyLocalizedCategoryName(
                  { name: row.consultation_type_name, name_he: row.consultation_type_name_he },
                  uiLanguage,
                )}
              </td>
              <td className="px-3 py-2 text-slate-400">{row.job_label}</td>
              <td className="px-3 py-2 text-slate-300">{row.income_amount ? `${row.income_amount} ${row.income_currency}` : "—"}</td>
              <td className="px-3 py-2 text-slate-300">{row.cost_amount ? `${row.cost_amount} ${row.cost_currency}` : "—"}</td>
              <td className="px-3 py-2 text-slate-400">
                {row.linked_income_transaction_id ? labels.linked : labels.unlinked}
              </td>
              <td className="px-3 py-2 text-slate-400">{row.linked_cost_transaction_id ? labels.linked : labels.unlinked}</td>
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
