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

/** Top shell header (root layout) — matches household UI language when available */
export function appHeaderStrings(lang: UiLanguage) {
  if (lang === "he") {
    return {
      appTitle: "ניהול כספי הבית",
      signedInAs: "מחובר כ־",
      signOut: "התנתק",
      signOutConfirm: "האם להתנתק עכשיו?",
      signIn: "התחבר",
      superAdmin: "מנהל על",
    };
  }
  return {
    appTitle: "Home Finance Management",
    signedInAs: "Signed in as",
    signOut: "Sign out",
    signOutConfirm: "Do you want to sign out now?",
    signIn: "Sign in",
    superAdmin: "Super admin",
  };
}
