import { getAuthSession, getCurrentUiLanguage } from "@/lib/auth";
import type { SectionId } from "@/lib/dashboard-sections";
import { fetchUsefulLinksForSection, type UsefulLinkRow } from "@/lib/useful-links/queries";
import { isDashboardSectionVisibleForMember } from "@/lib/useful-links/section-visible";
import { createMyUsefulLink, deleteMyUsefulLink } from "@/lib/useful-links/user-actions";

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500";

function LinkList({
  title,
  links,
  isHebrew,
  returnPath,
  allowDelete,
}: {
  title: string;
  links: UsefulLinkRow[];
  isHebrew: boolean;
  returnPath: string;
  allowDelete: boolean;
}) {
  if (links.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <ul className="space-y-1">
        {links.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-start justify-between gap-2 text-sm text-slate-200"
          >
            <div className="min-w-0 flex-1">
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all font-medium text-sky-400 hover:text-sky-300"
              >
                {l.title?.trim() || l.url}
              </a>
              {l.title?.trim() ? (
                <div className="break-all text-xs text-slate-500">{l.url}</div>
              ) : null}
              {l.notes?.trim() ? (
                <p className="text-xs text-slate-400">{l.notes.trim()}</p>
              ) : null}
            </div>
            {allowDelete ? (
              <form action={deleteMyUsefulLink} className="shrink-0">
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="return_path" value={returnPath} />
                <button
                  type="submit"
                  className="text-xs font-medium text-rose-400/90 hover:text-rose-300"
                >
                  {isHebrew ? "מחיקה" : "Remove"}
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function UsefulLinksBanner({
  sectionId,
  returnPath,
}: {
  sectionId: SectionId;
  returnPath: string;
}) {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    return null;
  }

  const householdId = session.user.householdId;
  const userId = session.user.id;

  const visible = await isDashboardSectionVisibleForMember({
    sectionId,
    householdId,
    userId,
  });
  if (!visible) {
    return null;
  }

  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const { system, household, user } = await fetchUsefulLinksForSection({
    sectionId,
    householdId,
    userId,
  });

  const hasAny = system.length > 0 || household.length > 0 || user.length > 0;

  return (
    <aside
      className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-slate-200"
      aria-label={isHebrew ? "קישורים שימושיים" : "Useful links"}
    >
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
        {isHebrew ? "קישורים שימושיים" : "Useful links"}
      </h2>
      <div className="space-y-3">
        <LinkList
          title={isHebrew ? "מערכת" : "System"}
          links={system}
          isHebrew={isHebrew}
          returnPath={returnPath}
          allowDelete={false}
        />
        <LinkList
          title={isHebrew ? "משק הבית" : "Household"}
          links={household}
          isHebrew={isHebrew}
          returnPath={returnPath}
          allowDelete={false}
        />
        <LinkList
          title={isHebrew ? "שלי" : "My links"}
          links={user}
          isHebrew={isHebrew}
          returnPath={returnPath}
          allowDelete
        />
        {!hasAny ? (
          <p className="text-xs text-slate-500">
            {isHebrew ? "אין קישורים להצגה. הוסיפו קישור אישי למטה." : "No links yet. Add a personal link below."}
          </p>
        ) : null}

        <form action={createMyUsefulLink} className="grid gap-2 border-t border-amber-500/20 pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="return_path" value={returnPath} />
          <div className="sm:col-span-2">
            <label className="mb-0.5 block text-[10px] text-slate-500">
              {isHebrew ? "כתובת" : "URL"} <span className="text-rose-400">*</span>
            </label>
            <input name="url" type="url" required placeholder="https://…" className={inputClass} />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-slate-500">
              {isHebrew ? "כותרת" : "Title"}
            </label>
            <input name="title" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] text-slate-500">
              {isHebrew ? "סדר" : "Order"}
            </label>
            <input name="sort_order" type="number" min={0} defaultValue={0} className={inputClass} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-0.5 block text-[10px] text-slate-500">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <input name="notes" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-md bg-amber-600/80 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-500"
            >
              {isHebrew ? "הוספת קישור אישי" : "Add my link"}
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
}
