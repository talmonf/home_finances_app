import { setMyUiLanguage } from "@/app/dashboard/user-preferences-actions";
import { dashboardHomeStrings, type UiLanguage } from "@/lib/ui-language";

export function UiLanguageToggle({ uiLanguage }: { uiLanguage: UiLanguage }) {
  const copy = dashboardHomeStrings(uiLanguage);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-500">{copy.languageLabel}</span>
      <form action={setMyUiLanguage} className="inline" data-skip-global-submit-feedback>
        <input type="hidden" name="ui_language" value="en" />
        <button
          type="submit"
          data-skip-global-submit-feedback
          className={
            uiLanguage === "en"
              ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
              : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          }
        >
          EN
        </button>
      </form>
      <form action={setMyUiLanguage} className="inline" data-skip-global-submit-feedback>
        <input type="hidden" name="ui_language" value="he" />
        <button
          type="submit"
          data-skip-global-submit-feedback
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
  );
}
