import { appBrandingStrings, type AppPortal } from "@/lib/app-branding-strings";

export const UI_LANGUAGES = ["en", "he"] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

export const DEFAULT_UI_LANGUAGE: UiLanguage = "en";

export function normalizeUiLanguage(v: string | null | undefined): UiLanguage {
  return v === "he" ? "he" : "en";
}

export function uiLanguageDirection(v: UiLanguage): "ltr" | "rtl" {
  return v === "he" ? "rtl" : "ltr";
}

export const UI_LANGUAGE_LABELS: Record<UiLanguage, string> = {
  en: "English",
  he: "עברית",
};

/** Home dashboard panel (setup tiles, search, ongoing sections) */
export function dashboardHomeStrings(lang: UiLanguage) {
  if (lang === "he") {
    return {
      searchTilesLabel: "חיפוש אריחים",
      searchPlaceholder: "לדוגמה: תרומות",
      setupHousehold: "הגדרת משק הבית",
      manageFinances: "ניהול הכספים שלך",
      done: "הושלם",
      notDone: "טרם הושלם",
      markDone: "סימון כהושלם",
      noSectionsEnabled: "מנהל העל שלך עדיין לא הפעיל אף אזור.",
      noSearchMatches: "אין אריחים שמתאימים לחיפוש.",
      languageLabel: "שפה",
    };
  }
  return {
    searchTilesLabel: "Search tiles",
    searchPlaceholder: "e.g. donations",
    setupHousehold: "Setup your household",
    manageFinances: "Manage your finances",
    done: "Done",
    notDone: "Not done",
    markDone: "Mark done",
    noSectionsEnabled: "Your super admin hasn't enabled any sections yet.",
    noSearchMatches: "No dashboard tiles match your search.",
    languageLabel: "Language",
  };
}

/** Top shell header (root layout) — matches household UI language when available */
export function appHeaderStrings(lang: UiLanguage, portal: AppPortal = "home") {
  const { title: appTitle } = appBrandingStrings(portal, lang);
  if (lang === "he") {
    return {
      appTitle,
      signedInAs: "מחובר כ־",
      changePassword: "שינוי סיסמה",
      signOut: "התנתק",
      signOutConfirm: "האם להתנתק עכשיו?",
      signIn: "התחבר",
      superAdmin: "מנהל על",
    };
  }
  return {
    appTitle,
    signedInAs: "Signed in as",
    changePassword: "Change password",
    signOut: "Sign out",
    signOutConfirm: "Do you want to sign out now?",
    signIn: "Sign in",
    superAdmin: "Super admin",
  };
}
