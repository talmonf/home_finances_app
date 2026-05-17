import type { AppPortal } from "@/lib/app-branding-strings";
import { appBrandingStrings } from "@/lib/app-branding-strings";
import type { UiLanguage } from "@/lib/ui-language";

export function loginPageStrings(portal: AppPortal, lang: UiLanguage) {
  const branding = appBrandingStrings(portal, lang);

  if (lang === "he") {
    return {
      ...branding,
      languageLabel: "שפה",
      email: "אימייל",
      password: "סיסמה",
      signIn: "התחבר",
      signingIn: "מתחבר...",
      invalidCredentials: "אימייל או סיסמה שגויים",
      passwordUpdated:
        "הסיסמה עודכנה. התחברו עם הסיסמה החדשה.",
      goToLogin: "לדף ההתחברות",
    };
  }

  return {
    ...branding,
    languageLabel: "Language",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signingIn: "Signing in...",
    invalidCredentials: "Invalid email or password",
    passwordUpdated: "Password updated. Sign in with your new password.",
    goToLogin: "Go to login",
  };
}
