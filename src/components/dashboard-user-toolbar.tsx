import { getAuthSession, getCurrentObfuscateSensitive, getCurrentUiLanguage } from "@/lib/auth";
import { setMyUiLanguage } from "@/app/dashboard/user-preferences-actions";
import { ObfuscateSessionToggle } from "@/components/obfuscate-session-toggle";

export async function DashboardUserToolbar({ showObfuscate }: { showObfuscate: boolean }) {
  const session = await getAuthSession();
  if (!session?.user?.householdId || session.user.isSuperAdmin) {
    return null;
  }

  const uiLanguage = await getCurrentUiLanguage();
  const obfuscate = showObfuscate ? await getCurrentObfuscateSensitive() : false;
  const isHebrew = uiLanguage === "he";

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300"
      role="toolbar"
      aria-label={isHebrew ? "העדפות תצוגה" : "Display preferences"}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-slate-500">{isHebrew ? "שפה" : "Language"}</span>
        <form action={setMyUiLanguage} className="inline">
          <input type="hidden" name="ui_language" value="en" />
          <button
            type="submit"
            className={
              uiLanguage === "en"
                ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          >
            EN
          </button>
        </form>
        <form action={setMyUiLanguage} className="inline">
          <input type="hidden" name="ui_language" value="he" />
          <button
            type="submit"
            className={
              uiLanguage === "he"
                ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
                : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }
          >
            עב
          </button>
        </form>
      </div>
      {showObfuscate ? (
        <>
          <div className="h-4 w-px bg-slate-700" aria-hidden />
          <ObfuscateSessionToggle initialOn={obfuscate} isHebrew={isHebrew} />
        </>
      ) : null}
    </div>
  );
}
