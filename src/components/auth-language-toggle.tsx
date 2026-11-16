import type { UiLanguage } from "@/lib/ui-language";

function languageButtonClass(active: boolean): string {
  return active
    ? "rounded-md bg-slate-700 px-2 py-1 font-medium text-slate-100"
    : "rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200";
}

/** EN / עב control used on the clinic splash page and the sign-in screen. */
export function AuthLanguageToggle({
  language,
  onSelect,
  className = "",
}: {
  language: UiLanguage;
  onSelect: (language: UiLanguage) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-end ${className}`.trim()}>
      <div dir="ltr" className="flex items-center gap-1.5 text-xs">
        <button type="button" onClick={() => onSelect("en")} className={languageButtonClass(language === "en")}>
          EN
        </button>
        <button type="button" onClick={() => onSelect("he")} className={languageButtonClass(language === "he")}>
          עב
        </button>
      </div>
    </div>
  );
}
