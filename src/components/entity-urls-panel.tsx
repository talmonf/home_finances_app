import { createEntityUrl, deleteEntityUrl } from "@/lib/entity-urls/actions";
import type { EntityUrlEntityKind } from "@/generated/prisma/enums";
import Link from "next/link";

export type EntityUrlListItem = {
  id: string;
  url: string;
  title: string | null;
  notes: string | null;
  sort_order: number;
};

type EntityUrlsPanelProps = {
  entityKind: EntityUrlEntityKind;
  entityId: string;
  redirectTo: string;
  urls: EntityUrlListItem[];
  isHebrew: boolean;
  /** When set, the inline add form is omitted and this link is shown instead. */
  addLinkHref?: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500";

export function EntityUrlsPanel({
  entityKind,
  entityId,
  redirectTo,
  urls,
  isHebrew,
  addLinkHref,
}: EntityUrlsPanelProps) {
  const showInlineAddForm = !addLinkHref;

  return (
    <div className="space-y-3 rounded-lg border border-slate-700/80 bg-slate-950/50 p-3">
      <div className="text-xs font-medium text-slate-400">
        {isHebrew ? "קישורים" : "Links"}
      </div>
      {urls.length > 0 ? (
        <ul className="space-y-2">
          {urls.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={u.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-sm font-medium text-sky-400 hover:text-sky-300"
                >
                  {u.title?.trim() || u.url}
                </a>
                {u.title?.trim() ? (
                  <div className="break-all text-xs text-slate-500">{u.url}</div>
                ) : null}
                {u.notes?.trim() ? (
                  <p className="mt-1 text-xs text-slate-400">{u.notes.trim()}</p>
                ) : null}
              </div>
              <form action={deleteEntityUrl} className="shrink-0">
                <input type="hidden" name="id" value={u.id} />
                <input type="hidden" name="redirect_to" value={redirectTo} />
                <button
                  type="submit"
                  className="text-xs font-medium text-rose-400/90 hover:text-rose-300"
                >
                  {isHebrew ? "מחיקה" : "Remove"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">{isHebrew ? "אין קישורים." : "No links yet."}</p>
      )}

      {showInlineAddForm ? (
        <form action={createEntityUrl} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="entity_kind" value={entityKind} />
          <input type="hidden" name="entity_id" value={entityId} />
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              URL <span className="text-rose-400">*</span>
            </label>
            <input
              name="url"
              type="url"
              required
              placeholder="https://…"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {isHebrew ? "כותרת" : "Title"}
            </label>
            <input name="title" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {isHebrew ? "סדר" : "Order"}
            </label>
            <input name="sort_order" type="number" min={0} defaultValue={0} className={inputClass} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <textarea
              name="notes"
              rows={2}
              className={inputClass}
              placeholder={isHebrew ? "אופציונלי" : "Optional"}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600"
            >
              {isHebrew ? "הוספת קישור" : "Add link"}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <Link
            href={addLinkHref}
            className="inline-flex rounded-md bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-600"
          >
            {isHebrew ? "הוספת קישור" : "Add link"}
          </Link>
        </div>
      )}
    </div>
  );
}
