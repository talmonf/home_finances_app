"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatHouseholdDateUtcWithOptionalTime } from "@/lib/household-date-format";
import type { HouseholdDateDisplayFormat } from "@/lib/household-date-format";
import { OBFUSCATED, formatClientNameForDisplay, formatMoneyLineForDisplay } from "@/lib/privacy-display";
import { therapyLocalizedCategoryName } from "@/lib/therapy-localized-name";
import type { UiLanguage } from "@/lib/ui-language";
import type { ConsultationListRowDto } from "./consultations-list-data";

type ColumnSortKey = "occurred_at" | "type" | "job" | "amount";
type SortDir = "asc" | "desc";

type Labels = {
  when: string;
  type: string;
  job: string;
  program: string;
  clients: string;
  amount: string;
  receipt: string;
  notes: string;
  edit: string;
  linked: string;
  unlinked: string;
  loadingMore: string;
  noMoreRows: string;
  loadMore: string;
};

function amountValue(text: string | null): number {
  if (!text) return 0;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ConsultationsListClient({
  initialRows,
  initialCursor,
  apiHrefBase,
  listBaseHref,
  labels,
  uiLanguage,
  dateDisplayFormat,
  obfuscate,
}: {
  initialRows: ConsultationListRowDto[];
  initialCursor: string | null;
  apiHrefBase: string;
  listBaseHref: string;
  labels: Labels;
  uiLanguage: UiLanguage;
  dateDisplayFormat: HouseholdDateDisplayFormat;
  obfuscate: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialCursor));
  const [sortKey, setSortKey] = useState<ColumnSortKey>("occurred_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const rowCount = useMemo(() => rows.length, [rows]);

  // When navigating (e.g. after submitting the modal), Next may update props without
  // fully remounting this client component. Keep the list state in sync.
  useEffect(() => {
    setRows(initialRows);
    setCursor(initialCursor);
    setHasMore(Boolean(initialCursor));
  }, [initialRows, initialCursor]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const sep = apiHrefBase.includes("?") ? "&" : "?";
      const res = await fetch(`${apiHrefBase}${sep}cursor=${encodeURIComponent(cursor)}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed loading consultations");
      const data = (await res.json()) as {
        rows: ConsultationListRowDto[];
        nextCursor: string | null;
      };
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
        aValue = (a.job_label ?? "").toLocaleLowerCase();
        bValue = (b.job_label ?? "").toLocaleLowerCase();
      } else if (sortKey === "amount") {
        aValue = amountValue(a.amount);
        bValue = amountValue(b.amount);
      } else {
        aValue = amountValue(a.amount);
        bValue = amountValue(b.amount);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [rows, sortDir, sortKey, uiLanguage]);

  return (
    <div>
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
              <th className="px-3 py-2 text-slate-300">{labels.program}</th>
              <th className="px-3 py-2 text-slate-300">{labels.clients}</th>
              <th className="px-3 py-2 text-slate-300">
                <button type="button" onClick={() => onSort("amount")} className="hover:text-slate-100">
                  {labels.amount}
                  {sortArrow("amount")}
                </button>
              </th>
              <th className="px-3 py-2 text-slate-300">{labels.receipt}</th>
              <th className="px-3 py-2 text-slate-300">{labels.notes}</th>
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
                <td className="px-3 py-2 text-slate-400">{row.program_label ?? "—"}</td>
                <td className="px-3 py-2 text-slate-400">
                  {row.clients.length > 0
                    ? row.clients.map((client) => formatClientNameForDisplay(obfuscate, client.name, null)).join(", ")
                    : "—"}
                </td>
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
                    "—"
                  )}
                </td>
                <td className="max-w-[14rem] px-3 py-2 text-slate-400">
                  {obfuscate ? (
                    OBFUSCATED
                  ) : row.notes?.trim() ? (
                    <span className="block max-w-[14rem] truncate" title={row.notes}>
                      {row.notes}
                    </span>
                  ) : (
                    "—"
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
      <div ref={sentinelRef} />
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-500">
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
