import { getAuthSession, getCurrentShowUsefulLinks, getCurrentUiLanguage } from "@/lib/auth";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard-sections";
import { isDashboardSectionVisibleForMember } from "@/lib/useful-links/section-visible";
import { isAllowedUsefulLinkReturnPath } from "@/lib/useful-links/return-path";
import { parseDashboardSectionId } from "@/lib/useful-links/parse-section-id";
import { createMyUsefulLink } from "@/lib/useful-links/user-actions";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ section?: string; return_path?: string }>;
};

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500";

export default async function AddUsefulLinkPage({ searchParams }: PageProps) {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    redirect("/");
  }

  const householdId = session.user.householdId;
  const userId = session.user.id;
  if (!(await getCurrentShowUsefulLinks())) {
    redirect("/dashboard");
  }
  const uiLanguage = await getCurrentUiLanguage();
  const isHebrew = uiLanguage === "he";

  const resolved = searchParams ? await searchParams : undefined;
  const sectionId = parseDashboardSectionId(resolved?.section);
  const returnPathRaw = resolved?.return_path?.trim();

  if (!sectionId || !returnPathRaw || !isAllowedUsefulLinkReturnPath(returnPathRaw)) {
    redirect("/dashboard");
  }

  const visible = await isDashboardSectionVisibleForMember({
    sectionId,
    householdId,
    userId,
  });
  if (!visible) {
    redirect(returnPathRaw.split("?")[0]);
  }

  const sectionMeta = DASHBOARD_SECTIONS.find((s) => s.id === sectionId);
  const sectionLabel = sectionMeta?.title ?? sectionId;

  return (
    <div className="flex min-h-screen justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-2xl space-y-6 rounded-2xl bg-slate-900 p-8 shadow-xl shadow-slate-950/60 ring-1 ring-slate-700">
        <header className="space-y-2">
          <Link
            href={returnPathRaw.split("?")[0]}
            className="mb-2 inline-block text-sm text-slate-400 hover:text-slate-200"
          >
            {isHebrew ? "חזרה →" : "← Back"}
          </Link>
          <h1 className="text-2xl font-semibold text-slate-50">
            {isHebrew ? "הוספת קישור אישי" : "Add personal link"}
          </h1>
          <p className="text-sm text-slate-400">
            {isHebrew ? "מקטע: " : "Section: "}
            <span className="text-slate-300">{sectionLabel}</span>
          </p>
        </header>

        <form action={createMyUsefulLink} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="section_id" value={sectionId} />
          <input type="hidden" name="return_path" value={returnPathRaw} />
          <div className="sm:col-span-2">
            <label htmlFor="url" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "כתובת" : "URL"} <span className="text-rose-400">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="title" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "כותרת" : "Title"}
            </label>
            <input id="title" name="title" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div>
            <label htmlFor="sort_order" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "סדר" : "Order"}
            </label>
            <input id="sort_order" name="sort_order" type="number" min={0} defaultValue={0} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-400">
              {isHebrew ? "הערות" : "Notes"}
            </label>
            <input id="notes" name="notes" type="text" className={inputClass} placeholder={isHebrew ? "אופציונלי" : "Optional"} />
          </div>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-amber-600/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-500"
            >
              {isHebrew ? "שמירה" : "Save link"}
            </button>
            <Link
              href={returnPathRaw.split("?")[0]}
              className="inline-flex items-center rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {isHebrew ? "ביטול" : "Cancel"}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
