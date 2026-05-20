import type { UiLanguage } from "@/lib/ui-language";

export type AppPortal = "home" | "clinic";

export function parseAppPortalCookie(value: string | undefined): AppPortal | null {
  if (value === "clinic") return "clinic";
  if (value === "home") return "home";
  return null;
}

export function appBrandingStrings(portal: AppPortal, lang: UiLanguage) {
  if (portal === "clinic") {
    if (lang === "he") {
      return {
        title: "ניהול קליניקה",
        tagline: "התחברו כדי לנהל את הקליניקה.",
        metadataDescription: "מערכת ניהול קליניקה פרטית",
        loggedOutPrompt: "התחברו כדי לגשת לקליניקה.",
      };
    }
    return {
      title: "Clinic management",
      tagline: "Sign in to manage your clinic.",
      metadataDescription: "Self-hosted private clinic management",
      loggedOutPrompt: "Please sign in to access your clinic.",
    };
  }

  if (lang === "he") {
    return {
      title: "ניהול כספי הבית",
      tagline: "התחברו כדי לנהל את משקי הבית והכספים.",
      metadataDescription: "מערכת ניהול כספים אישית רב-משקית",
      loggedOutPrompt: "התחברו כדי לגשת למשקי הבית והכספים.",
    };
  }
  return {
    title: "Home Finance Management",
    tagline: "Sign in to manage your households and finances.",
    metadataDescription: "Self-hosted multi-household personal finance system",
    loggedOutPrompt: "Please sign in to access your households and finances.",
  };
}

export function loginHrefForPortal(portal: AppPortal): string {
  return portal === "home" ? "/login?portal=home" : "/login";
}
