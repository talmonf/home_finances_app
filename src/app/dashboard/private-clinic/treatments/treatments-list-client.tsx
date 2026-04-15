"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatClientNameForDisplay, formatDecimalAmountForDisplay } from "@/lib/privacy-display";
import { formatHouseholdDate, formatHouseholdDateUtcWithOptionalTime } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import type { UiLanguage } from "@/lib/ui-language";
import type { TreatmentListRowDto } from "./treatments-list-data";
import { treatmentPaymentStatusLabel } from "@/lib/private-clinic-i18n";

type Labels = {
  when: string;
  client: string;
  job: string;
  amount: string;
  paid: string;
  receiptCol: string;
  paymentDetailsCol: string;
  edit: string;
  loadingMore: string;
  noMoreRows: string;
  loadMore: string;
};

type ColumnSortKey = "occurred_at" | "client" | "job" | "amount" | "paid" | "receipt" | "payment_details" | "edit";
type SortDir = "asc" | "desc";

export function TreatmentsListClient({
  initialRows,
  initialCursor,
  apiHrefBase,
  listBaseHref,
  dateDisplayFormat,
  uiLanguage,
  obfuscate,
  labels,
}: {
  initialRows: TreatmentListRowDto[];
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
  const [sortKey, setSortKey] = useState<ColumnSortKey>("occurred_at");
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
      if (!res.ok) throw new Error("Failed loading treatments");
      const data = (await res.json()) as { rows: TreatmentListRowDto[]; nextCursor: string | null };
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
    const rankForPaidStatus = (status: TreatmentListRowDto["payment_status"]): number => {
      if (status === "unpaid") return 0;
      if (status === "partial") return 1;
      return 2;
    };

    const sortValue = (row: TreatmentListRowDto): number | string => {
      if (sortKey === "occurred_at") return new Date(row.occurred_at_iso).getTime();
      if (sortKey === "client") return `${row.client_first_name} ${row.client_last_name ?? ""}`.trim().toLocaleLowerCase();
      if (sortKey === "job") return row.job_label.toLocaleLowerCase();
      if (sortKey === "amount") return Number(row.amount);
      if (sortKey === "paid") return rankForPaidStatus(row.payment_status);
      if (sortKey === "receipt") return row.receipt_allocations[0]?.receipt_number ?? "";
      if (sortKey === "edit") return row.id;
      return row.payment_date_iso ? new Date(row.payment_date_iso).getTime() : 0;
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
                <button type="button" onClick={() => onSort("occurred_at")} className="hover:text-slate-100">
                  {labels.when}
                  {sortArrow("occurred_at")}
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
                <button type="button" onClick={() => onSort("paid")} className="hover:text-slate-100">
                  {labels.paid}
                  {sortArrow("paid")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("receipt")} className="hover:text-slate-100">
                  {labels.receiptCol}
                  {sortArrow("receipt")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("payment_details")} className="hover:text-slate-100">
                  {labels.paymentDetailsCol}
                  {sortArrow("payment_details")}
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
            {sortedRows.map((t) => {
              const paymentDate = t.payment_date_iso
                ? formatHouseholdDate(new Date(t.payment_date_iso), dateDisplayFormat)
                : "—";

              return (
                <tr key={t.id} className="border-b border-slate-700/80">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-300">
                    {formatHouseholdDateUtcWithOptionalTime(new Date(t.occurred_at_iso), dateDisplayFormat)}
                  </td>
                  <td className="px-3 py-2 text-slate-100">
                    {formatClientNameForDisplay(obfuscate, t.client_first_name, t.client_last_name)}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{t.job_label}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {formatDecimalAmountForDisplay(obfuscate, t.amount, t.currency, uiLanguage)}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{treatmentPaymentStatusLabel(uiLanguage, t.payment_status)}</td>
                  <td className="max-w-[12rem] px-3 py-2 text-slate-400">
                    {t.receipt_allocations.length > 0 ? (
                      <ul className="list-none space-y-1">
                        {t.receipt_allocations.map((a) => (
                          <li key={a.id}>
                            <Link href={`/dashboard/private-clinic/receipts/${a.receipt_id}`} className="text-sky-400 hover:underline">
                              #{a.receipt_number}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="max-w-[14rem] px-3 py-2 text-slate-400">{paymentDate}</td>
                  <td className="px-3 py-2">
                    <Link href={`${listBaseHref}&modal=edit&edit_id=${encodeURIComponent(t.id)}`} className="text-xs text-sky-400">
                      {labels.edit}
                    </Link>
                  </td>
                </tr>
              );
            })}
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
