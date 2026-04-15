"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatClientNameForDisplay, formatDecimalAmountForDisplay } from "@/lib/privacy-display";
import { formatHouseholdDate } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import type { UiLanguage } from "@/lib/ui-language";
import type { ReceiptListRowDto } from "./receipts-list-data";

type Labels = {
  number: string;
  date: string;
  client: string;
  job: string;
  amount: string;
  coverage: string;
  treatments: string;
  edit: string;
  loadingMore: string;
  noMoreRows: string;
  loadMore: string;
};

type ColumnSortKey = "number" | "date" | "client" | "job" | "amount" | "coverage" | "treatments" | "edit";
type SortDir = "asc" | "desc";

export function ReceiptsListClient({
  initialRows,
  initialCursor,
  apiHrefBase,
  listBaseHref,
  dateDisplayFormat,
  uiLanguage,
  obfuscate,
  labels,
}: {
  initialRows: ReceiptListRowDto[];
  initialCursor: string | null;
  apiHrefBase: string;
  listBaseHref: string;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  uiLanguage: UiLanguage;
  obfuscate: boolean;
  labels: Labels;
}) {
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialCursor));
  const [sortKey, setSortKey] = useState<ColumnSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const sep = apiHrefBase.includes("?") ? "&" : "?";
      const res = await fetch(`${apiHrefBase}${sep}cursor=${encodeURIComponent(cursor)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed loading receipts");
      const data = (await res.json()) as { rows: ReceiptListRowDto[]; nextCursor: string | null };
      if (data.rows.length > 0) {
        setRows((prev) => [...prev, ...data.rows]);
      }
      setCursor(data.nextCursor);
      setHasMore(Boolean(data.nextCursor));
    } finally {
      setLoadingMore(false);
    }
  }, [apiHrefBase, cursor, hasMore, loadingMore]);

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "320px 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMore, loadMore]);

  const sortedRows = useMemo(() => {
    const sortValue = (row: ReceiptListRowDto): number | string => {
      if (sortKey === "number") return row.receipt_number.toLocaleLowerCase();
      if (sortKey === "client") return `${row.client_first_name ?? ""} ${row.client_last_name ?? ""}`.trim().toLocaleLowerCase();
      if (sortKey === "job") return row.job_label.toLocaleLowerCase();
      if (sortKey === "amount") return Number(row.total_amount);
      if (sortKey === "coverage")
        return `${row.covered_period_start_iso ?? ""}-${row.covered_period_end_iso ?? ""}`.toLocaleLowerCase();
      if (sortKey === "treatments") return row.linked_treatments_count;
      if (sortKey === "edit") return row.id;
      return new Date(row.issued_at_iso).getTime();
    };

    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = sortValue(a);
      const bv = sortValue(b);
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * direction;
      }
      return String(av).localeCompare(String(bv)) * direction;
    });
  }, [rows, sortDir, sortKey]);

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

  const rowCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/80">
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("number")} className="hover:text-slate-100">
                  {labels.number}
                  {sortArrow("number")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("date")} className="hover:text-slate-100">
                  {labels.date}
                  {sortArrow("date")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("client")} className="hover:text-slate-100">
                  {labels.client}
                  {sortArrow("client")}
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
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("coverage")} className="hover:text-slate-100">
                  {labels.coverage}
                  {sortArrow("coverage")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("treatments")} className="hover:text-slate-100">
                  {labels.treatments}
                  {sortArrow("treatments")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("edit")} className="hover:text-slate-100">
                  {labels.edit}
                  {sortArrow("edit")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((rec) => (
              <tr key={rec.id} className="border-b border-slate-700/80">
                <td className="px-3 py-2 text-slate-100">{rec.receipt_number}</td>
                <td className="px-3 py-2 text-slate-400">{formatHouseholdDate(new Date(rec.issued_at_iso), dateDisplayFormat)}</td>
                <td className="px-3 py-2 text-slate-300">
                  {rec.recipient_type === "client" && rec.client_id && rec.client_first_name ? (
                    <Link
                      href={`/dashboard/private-clinic/clients/${encodeURIComponent(rec.client_id)}/edit`}
                      className="text-sky-400 hover:underline"
                    >
                      {formatClientNameForDisplay(obfuscate, rec.client_first_name, rec.client_last_name)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-slate-400">{rec.job_label}</td>
                <td className="px-3 py-2 text-slate-200">
                  {formatDecimalAmountForDisplay(obfuscate, rec.total_amount, rec.currency, uiLanguage)}
                </td>
                <td className="px-3 py-2 text-slate-400">
                  {rec.covered_period_start_iso && rec.covered_period_end_iso
                    ? `${rec.covered_period_start_iso.slice(0, 10)} - ${rec.covered_period_end_iso.slice(0, 10)}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-slate-300">{rec.linked_treatments_count}</td>
                <td className="px-3 py-2 text-xs">
                  <Link href={`${listBaseHref}&modal=edit&edit_id=${encodeURIComponent(rec.id)}`} className="text-sky-400">
                    {labels.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div ref={sentinelRef} />
      <div className="flex items-center justify-between px-1 text-xs text-slate-500">
        <span>{rowCount}</span>
        {hasMore ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="rounded border border-slate-600 px-2 py-1 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingMore ? labels.loadingMore : labels.loadMore}
          </button>
        ) : (
          <span>{labels.noMoreRows}</span>
        )}
      </div>
    </div>
  );
}
