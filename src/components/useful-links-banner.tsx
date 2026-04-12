import { getAuthSession, getCurrentUiLanguage } from "@/lib/auth";
import type { SectionId } from "@/lib/dashboard-sections";
import { fetchUsefulLinksForSection, type UsefulLinkRow } from "@/lib/useful-links/queries";
import { isDashboardSectionVisibleForMember } from "@/lib/useful-links/section-visible";
import { deleteMyUsefulLink } from "@/lib/useful-links/user-actions";
import Link from "next/link";

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
  const addHref = `/dashboard/useful-links/add?section=${encodeURIComponent(sectionId)}&return_path=${encodeURIComponent(returnPath)}`;

  return (
    <aside
      className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-slate-200"
      aria-label={isHebrew ? "קישורים שימושיים" : "Useful links"}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-200/90">
          {isHebrew ? "קישורים שימושיים" : "Useful links"}
        </h2>
        <Link
          href={addHref}
          className="shrink-0 rounded-md bg-amber-600/80 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-amber-500"
        >
          {isHebrew ? "הוספת קישור" : "Add link"}
        </Link>
      </div>
      <div className="space-y-2">
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
            {isHebrew ? "אין קישורים להצגה." : "No links to show yet."}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
