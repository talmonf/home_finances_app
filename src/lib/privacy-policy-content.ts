import type { UiLanguage } from "@/lib/ui-language";

export const PRIVACY_POLICY_PATH = "/privacy";
export const PRIVACY_POLICY_LAST_UPDATED_ISO = "2026-10-20";
export const GOOGLE_API_USER_DATA_POLICY_URL =
  "https://developers.google.com/terms/api-services-user-data-policy";
export const GOOGLE_ACCOUNT_PERMISSIONS_URL = "https://myaccount.google.com/permissions";

export type PrivacyPolicySection = {
  id: string;
  title: string;
  paragraphs: string[];
};

function extractEmail(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const angle = trimmed.match(/<([^>]+)>/);
  const candidate = (angle?.[1] ?? trimmed).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;
  if (candidate.toLowerCase().startsWith("noreply@") || candidate.toLowerCase().startsWith("no-reply@")) {
    return null;
  }
  return candidate;
}

/** Optional public contact for privacy requests. Set PRIVACY_CONTACT_EMAIL in the environment. */
export function getPrivacyContactEmail(): string | null {
  return extractEmail(process.env.PRIVACY_CONTACT_EMAIL);
}

export function privacyPolicyPageStrings(lang: UiLanguage) {
  if (lang === "he") {
    return {
      documentTitle: "מדיניות פרטיות",
      metaDescription:
        "מדיניות הפרטיות של ניהול כספי הבית וניהול קליניקה, כולל השימוש בנתוני Google Calendar.",
      kicker: "מסמך ציבורי",
      title: "מדיניות פרטיות",
      lastUpdatedLabel: "עודכן לאחרונה",
      lastUpdatedDisplay: "20 באוקטובר 2026",
      jumpToOtherLanguage: "English version",
      otherLanguageHref: "#privacy-en",
      intro:
        "מדיניות זו מתארת איך מופע זה של ניהול כספי הבית וניהול קליניקה (\"השירות\") אוסף, משתמש, מאחסן ומשתף מידע, כולל מידע שמתקבל מממשקי Google כאשר מחברים את Google Calendar.",
      googleLimitedUse:
        "השימוש של השירות במידע שמתקבל מממשקי Google, והעברתו לכל יישום אחר, תואמים את מדיניות נתוני המשתמש של שירותי Google API, כולל דרישות השימוש המוגבל (Limited Use).",
      googlePolicyLinkLabel: "מדיניות נתוני המשתמש של Google API",
      sections: hebrewSections(),
      contactHeading: "יצירת קשר",
      contactWithEmail:
        "לשאלות פרטיות או לבקשות גישה, תיקון או מחיקה, פנו אל מפעיל המופע בכתובת:",
      contactWithoutEmail:
        "לשאלות פרטיות או לבקשות גישה, תיקון או מחיקה, פנו אל מפעיל המופע — כתובת אימייל איש הקשר למפתחים במסך ההסכמה של Google OAuth, או מנהל משק הבית שהזמין אתכם לחשבון.",
      revokeGoogleLabel: "ביטול גישת Google",
    };
  }

  return {
    documentTitle: "Privacy Policy",
    metaDescription:
      "Privacy policy for Home Finance Management and Clinic management, including how Google Calendar data is used.",
    kicker: "Public document",
    title: "Privacy Policy",
    lastUpdatedLabel: "Last updated",
    lastUpdatedDisplay: "20 October 2026",
    jumpToOtherLanguage: "גרסה בעברית",
    otherLanguageHref: "#privacy-he",
    intro:
      "This policy explains how this deployed instance of Home Finance Management and Clinic management (the “Service”) collects, uses, stores, and shares information, including information received from Google APIs when you connect Google Calendar.",
    googleLimitedUse:
      "The Service’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
    googlePolicyLinkLabel: "Google API Services User Data Policy",
    sections: englishSections(),
    contactHeading: "Contact",
    contactWithEmail:
      "For privacy questions or to request access, correction, or deletion, contact the operator of this instance at:",
    contactWithoutEmail:
      "For privacy questions or to request access, correction, or deletion, contact the operator of this instance using the developer contact email on the Google OAuth consent screen, or the household administrator who invited you.",
    revokeGoogleLabel: "Revoke Google access",
  };
}

function englishSections(): PrivacyPolicySection[] {
  return [
    {
      id: "who",
      title: "Who operates the Service",
      paragraphs: [
        "The Service is software for household finance management and optional private-clinic practice management. The operator of this instance is the person or organization that hosts it, configured the Google Cloud OAuth client, and issued your account.",
        "The Service is not a consumer app store product. Access is by invitation to a household account.",
      ],
    },
    {
      id: "collect",
      title: "Information we collect",
      paragraphs: [
        "Account data: name, email address, password hash, household membership, language and display preferences.",
        "Household data you enter: finances, family members, renewals, documents you upload, and similar records you choose to store.",
        "Clinic data you enter (if that module is enabled): clients, appointments, treatments, receipts, and related practice records.",
        "Technical data: session cookies needed to keep you signed in, and operational logs used to run and secure the Service.",
      ],
    },
    {
      id: "google",
      title: "Google Calendar data",
      paragraphs: [
        "If you choose to connect Google Calendar, the Service requests only the OAuth scope https://www.googleapis.com/auth/calendar.events. That scope lets the Service create, update, and delete calendar events. It does not request Gmail, Drive, full calendar read access, or your Google profile beyond what is needed to complete OAuth.",
        "Clinic sync (optional): when you enable it, the Service writes appointment events to your calendar (for example client name, role/job title, start and end time) and updates or deletes those events when you reschedule or cancel in the Service.",
        "Family dates sync (optional): when you enable it, the Service writes events for household birthdays, anniversaries, and special dates (names and date labels, including Hebrew calendar labels). Gregorian dates are yearly all-day events. Hebrew dates are timed evening events on the civil evening the Hebrew day begins.",
        "What we receive from Google: OAuth access and refresh tokens, and identifiers of events the Service created or tagged, so it can update or delete them without duplicating them. The Service looks up those events using its own private event keys. It does not read your unrelated calendar events.",
        "Tokens are stored encrypted in the Service database and used only to call Google Calendar on your behalf. Event identifiers are stored so later syncs can update the same events.",
      ],
    },
    {
      id: "use",
      title: "How we use information",
      paragraphs: [
        "To provide the Service you signed in for: household records, clinic workflows, reminders, and the Google Calendar features you enable.",
        "To send emails you configure (for example renewal digests or clinic digests) through the instance’s outbound email provider.",
        "To maintain security, diagnose failures, and operate backups.",
        "Google Calendar data is not used for advertising, not sold, and not used to train artificial-intelligence models. Other optional AI features in the Service (for example transaction import assistance or audio transcription) use data you enter in those features, not data obtained from Google APIs.",
      ],
    },
    {
      id: "share",
      title: "How we share information",
      paragraphs: [
        "We do not sell your information.",
        "Google Calendar: event content you sync is sent to Google so it can appear on the Google account you connected. Google’s handling of that calendar is governed by Google’s policies.",
        "Processors that host or operate this instance typically include the application host, the database provider, object storage for files you upload, and the outbound email provider. Those parties process data to run the Service, not to use Google user data for their own purposes.",
        "We may disclose information if required by law, or to protect the security of the Service or its users.",
      ],
    },
    {
      id: "limited-use",
      title: "Google Limited Use",
      paragraphs: [
        "Information received from Google APIs is used only to provide or improve the user-facing features described above, and to maintain or secure those features.",
        "That information is not transferred to others except as needed to operate the Service (for example encrypted token storage in the instance database), for security, to comply with law, or with your direction.",
        "Human access to Google user data is limited to cases you request (for example support you initiate), security investigations, or legal obligations.",
      ],
    },
    {
      id: "security",
      title: "Storage and security",
      paragraphs: [
        "The Service is served over HTTPS. Session credentials are stored in HTTP-only cookies. Google OAuth tokens are encrypted before they are stored.",
        "Access to household and clinic records is scoped to the signed-in household. You remain responsible for the people you invite to that household.",
      ],
    },
    {
      id: "retention",
      title: "Retention",
      paragraphs: [
        "Account and household records are kept for as long as the account exists, unless the operator deletes them sooner.",
        "Google tokens and calendar event mappings are kept until you disconnect Google Calendar in the Service, the Google grant is revoked, or the operator deletes the account. After disconnect, the Service stops calling Google with those tokens. Events already written to your Google Calendar remain there until you delete them in Google Calendar or they are removed by a later sync while still connected.",
      ],
    },
    {
      id: "choices",
      title: "Your choices",
      paragraphs: [
        "You can decline to connect Google Calendar. Clinic and household features work without it.",
        "You can disconnect or reconnect Google Calendar in Clinic settings and in household email / family-date settings.",
        "You can revoke the Service’s access at any time in your Google Account permissions. After revocation, calendar sync will fail until you reconnect.",
        "You can ask the instance operator or household administrator to correct or delete your account data, subject to legal retention that may apply to clinic records.",
      ],
    },
    {
      id: "children",
      title: "Children",
      paragraphs: [
        "The Service is intended for invited adult household and clinic users. It is not directed at children.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      paragraphs: [
        "The operator may update this page when the Service or its processors change. The date at the top of this page will change when that happens.",
      ],
    },
  ];
}

function hebrewSections(): PrivacyPolicySection[] {
  return [
    {
      id: "who",
      title: "מי מפעיל את השירות",
      paragraphs: [
        "השירות הוא תוכנה לניהול כספי הבית ולניהול קליניקה פרטית (מודול רשות). מפעיל המופע הוא האדם או הארגון שמארח אותו, שהגדיר את לקוח Google Cloud OAuth, ושהנפיק לכם חשבון.",
        "אין כאן אפליקציה ציבורית מחנות. הגישה היא בהזמנה לחשבון משק בית.",
      ],
    },
    {
      id: "collect",
      title: "איזה מידע נאסף",
      paragraphs: [
        "נתוני חשבון: שם, כתובת אימייל, גיבוב סיסמה, שיוך למשק בית, והעדפות תצוגה ושפה.",
        "נתוני משק בית שאתם מזינים: כספים, בני משפחה, חידושים, מסמכים שאתם מעלים, ורשומות דומות שאתם בוחרים לשמור.",
        "נתוני קליניקה שאתם מזינים (אם המודול פעיל): לקוחות, תורים, טיפולים, קבלות ורשומות קשורות.",
        "נתונים טכניים: עוגיות הפעלה לצורך התחברות, ויומני תפעול לצורך הרצה ואבטחה.",
      ],
    },
    {
      id: "google",
      title: "נתוני Google Calendar",
      paragraphs: [
        "אם בוחרים לחבר את Google Calendar, השירות מבקש רק את ההרשאה https://www.googleapis.com/auth/calendar.events. ההרשאה מאפשרת ליצור, לעדכן ולמחוק אירועים ביומן. אין בקשה ל־Gmail, ל־Drive, לקריאת היומן המלא, או לפרופיל Google מעבר למה שנדרש להשלמת OAuth.",
        "סנכרון קליניקה (רשות): כשהוא מופעל, השירות כותב אירועי תורים ליומן שלכם (למשל שם לקוח, תפקיד, שעת התחלה וסיום) ומעדכן או מוחק אותם כשמשנים מועד או מבטלים בשירות.",
        "סנכרון מועדים משפחתיים (רשות): כשהוא מופעל, השירות כותב אירועים לימי הולדת, ימי נישואין ומועדים מיוחדים (שמות ותוויות תאריך, כולל תוויות עבריות). תאריכים לועזיים הם אירועי יום־שלם שנתיים. תאריכים עבריים הם אירועים בשעות הערב האזרחי שבו מתחיל היום העברי.",
        "מה מתקבל מ־Google: אסימוני גישה ורענון של OAuth, ומזהי אירועים שהשירות יצר או תייג, כדי לעדכן או למחוק אותם בלי לשכפל. השירות מאתר את האירועים האלה לפי מפתחות פרטיים שלו. הוא לא קורא אירועים אחרים ביומן.",
        "האסימונים נשמרים מוצפנים במסד הנתונים של השירות ומשמשים רק לקריאות ל־Google Calendar בשמכם. מזהי האירועים נשמרים כדי שהסנכרון הבא יעדכן את אותם אירועים.",
      ],
    },
    {
      id: "use",
      title: "איך משתמשים במידע",
      paragraphs: [
        "כדי לספק את השירות שאליו התחברתם: רשומות משק הבית, תהליכי הקליניקה, תזכורות, ותכונות Google Calendar שהפעלתם.",
        "כדי לשלוח אימיילים שהגדרתם (למשל סיכומי חידושים או סיכום קליניקה) דרך ספק הדוא״ל של המופע.",
        "כדי לשמור על אבטחה, לאבחן תקלות ולהפעיל גיבויים.",
        "נתוני Google Calendar לא משמשים לפרסום, לא נמכרים, ולא משמשים לאימון מודלי בינה מלאכותית. תכונות AI אחרות בשירות (למשל סיוע בייבוא תנועות או תמלול) משתמשות בנתונים שאתם מזינים באותן תכונות, לא בנתונים שהתקבלו מממשקי Google.",
      ],
    },
    {
      id: "share",
      title: "עם מי משתפים מידע",
      paragraphs: [
        "אין מכירת מידע.",
        "Google Calendar: תוכן האירועים שאתם מסנכרנים נשלח ל־Google כדי שיופיע בחשבון שחיברתם. הטיפול של Google ביומן כפוף למדיניות של Google.",
        "מעבדים שמארחים או מפעילים את המופע כוללים בדרך כלל את מארח היישום, ספק מסד הנתונים, אחסון קבצים שאתם מעלים, וספק הדוא״ל היוצא. הם מעבדים נתונים כדי להריץ את השירות, לא כדי להשתמש בנתוני Google למטרותיהם.",
        "ייתכן גילוי מידע אם החוק מחייב זאת, או כדי להגן על אבטחת השירות או המשתמשים.",
      ],
    },
    {
      id: "limited-use",
      title: "שימוש מוגבל של Google",
      paragraphs: [
        "מידע שמתקבל מממשקי Google משמש רק כדי לספק או לשפר את התכונות שתוארו למעלה, ולתחזק או לאבטח אותן.",
        "המידע הזה לא מועבר לאחרים אלא ככל שנדרש להפעלת השירות (למשל שמירת אסימונים מוצפנת במסד הנתונים), לאבטחה, לעמידה בחוק, או לפי הוראתכם.",
        "גישה אנושית לנתוני Google מוגבלת למקרים שביקשתם (למשל תמיכה שיזמתם), לחקירות אבטחה, או לחובות חוקיות.",
      ],
    },
    {
      id: "security",
      title: "אחסון ואבטחה",
      paragraphs: [
        "השירות מוגש ב־HTTPS. פרטי הפעלה נשמרים בעוגיות HTTP-only. אסימוני Google OAuth מוצפנים לפני השמירה.",
        "הגישה לרשומות משק הבית והקליניקה מוגבלת למשק הבית המחובר. האחריות על מי שמזמינים למשק הבית נשארת אצלכם.",
      ],
    },
    {
      id: "retention",
      title: "שמירה",
      paragraphs: [
        "רשומות חשבון ומשק בית נשמרות כל עוד החשבון קיים, אלא אם המפעיל מוחק אותן מוקדם יותר.",
        "אסימוני Google ומיפויי אירועים נשמרים עד שמנתקים את Google Calendar בשירות, עד שביטול ההרשאה ב־Google, או עד מחיקת החשבון. אחרי ניתוק השירות מפסיק לקרוא ל־Google עם האסימונים האלה. אירועים שכבר נכתבו ליומן Google נשארים שם עד שמוחקים אותם ביומן Google או עד שהסנכרון מסיר אותם כל עוד החיבור פעיל.",
      ],
    },
    {
      id: "choices",
      title: "הבחירות שלכם",
      paragraphs: [
        "אפשר לא לחבר את Google Calendar. הקליניקה ומשק הבית פועלים גם בלעדיו.",
        "אפשר לנתק או לחבר מחדש בהגדרות הקליניקה ובהגדרות האימייל / המועדים המשפחתיים.",
        "אפשר לבטל את גישת השירות בכל עת בהרשאות חשבון Google. אחרי הביטול הסנכרון ייכשל עד חיבור מחדש.",
        "אפשר לבקש ממפעיל המופע או ממנהל משק הבית לתקן או למחוק נתוני חשבון, בכפוף לחובות שמירה שעשויות לחול על רשומות קליניקה.",
      ],
    },
    {
      id: "children",
      title: "ילדים",
      paragraphs: [
        "השירות מיועד למשתמשי משק בית וקליניקה בוגרים שהוזמנו. הוא לא מיועד לילדים.",
      ],
    },
    {
      id: "changes",
      title: "שינויים במדיניות",
      paragraphs: [
        "המפעיל עשוי לעדכן דף זה כשהשירות או המעבדים משתנים. התאריך בראש הדף ישתנה אז.",
      ],
    },
  ];
}
