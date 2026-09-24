import type { UiLanguage } from "@/lib/ui-language";

export type ClinicSplashSection = {
  id: string;
  title: string;
  body: string;
  highlight?: boolean;
};

export type ClinicSplashCopy = {
  productName: string;
  kicker: string;
  pitch: string;
  sections: ClinicSplashSection[];
  signIn: string;
  requestAccess: string;
  formTitle: string;
  formIntro: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  messageLabel: string;
  submit: string;
  submitting: string;
  cancel: string;
  success: string;
  errorInvalid: string;
  errorUnavailable: string;
  errorGeneric: string;
  languageLabel: string;
  close: string;
};

const SECTIONS_EN: ClinicSplashSection[] = [
  {
    id: "day",
    title: "The working day",
    body: "Two ways to run the practice, and you can combine them. Book an appointment for a specific date and time, or set a cadence — once a week, for example — so the next visit appears on Upcoming visits after each session.",
  },
  {
    id: "notes",
    title: "Between clients",
    body: "Log the treatment and attach files while the session is still fresh. Transcribe a short spoken summary in English or Hebrew, then review it before it becomes clinical notes. In Settings, name the note fields the way you actually write.",
  },
  {
    id: "paid",
    title: "Getting paid",
    body: "Receipts are the money collected. Treatments, consultations, and travel are the work. When the period total matches, link them on the new receipt, then review or adjust those links on the same screen.",
  },
  {
    id: "morning",
    title: "Morning (Green Invoice)",
    highlight: true,
    body: "Connect your Morning business account in Settings. Saving a new receipt can issue it in Morning and assign the receipt number automatically. A physical receipt book still works when you do not want Morning to issue that one.",
  },
  {
    id: "calendar",
    title: "Your calendar and inbox",
    body: "Google Calendar stays in step, one way: creating, rescheduling, or canceling an appointment updates Google. A scheduled clinic digest email lists the appointments and visits coming up, so the week is in your inbox before you open the app.",
  },
  {
    id: "practice",
    title: "The rest of the practice",
    body: "Start from a job and its programs — service lines and prices — then add clients. Consultations sit apart from sessions. Expenses, travel, petrol, clinic insurance, and work subscriptions sit beside reminders, reports, and an income view. Import or export a workbook when you move in. Families are optional, for grouping related clients. The app itself is in Hebrew and English.",
  },
];

const SECTIONS_HE: ClinicSplashSection[] = [
  {
    id: "day",
    title: "יום העבודה",
    body: "שתי דרכים לנהל את הפרקטיקה, ואפשר לשלב ביניהן. קובעים תור לתאריך ושעה, או מגדירים קצב — למשל פעם בשבוע — כך שהביקור הבא מופיע בביקורים קרובים אחרי כל מפגש.",
  },
  {
    id: "notes",
    title: "בין לקוח ללקוח",
    body: "מתעדים את הטיפול ומצרפים קבצים כשהמפגש עוד טרי. מתמללים סיכום קצר בעברית או באנגלית, ואז עוברים עליו לפני שהוא נכנס להערות. בהגדרות נותנים לשדות ההערה את השמות שבהם באמת כותבים.",
  },
  {
    id: "paid",
    title: "הגבייה",
    body: "קבלות הן הכסף שנגבה. טיפולים, ייעוצים ונסיעות הם העבודה. כשהסכום בתקופה תואם, משייכים אותם בקבלה החדשה, ואז בודקים או מתקנים את השיוך באותו מסך.",
  },
  {
    id: "morning",
    title: "Morning (חשבונית ירוקה)",
    highlight: true,
    body: "מחברים את חשבון העסק ב-Morning מתוך ההגדרות. שמירת קבלה חדשה יכולה להפיק אותה ב-Morning ולהקצות מספר קבלה אוטומטית. פנקס קבלות פיזי נשאר זמין כשלא רוצים ש-Morning יפיק את הקבלה הזו.",
  },
  {
    id: "calendar",
    title: "היומן ותיבת הדואר",
    body: "Google Calendar נשאר מעודכן, בכיוון אחד: יצירה, שינוי מועד או ביטול של תור מעדכנים את Google. אימייל סיכום מתוזמן מציג את התורים והביקורים הקרובים, כך שהשבוע מחכה בתיבה לפני שפותחים את המערכת.",
  },
  {
    id: "practice",
    title: "שאר הפרקטיקה",
    body: "מתחילים ממשרה והתוכניות שלה — קווי שירות ומחירים — ואז מוסיפים לקוחות. ייעוצים נפרדים ממפגשים. הוצאות, נסיעות, דלק, ביטוח קליניקה ומנויים מקצועיים יושבים לצד תזכורות, דוחות ותצוגת הכנסות. מייבאים או מייצאים חוברת כשעוברים למערכת. משפחות הן אופציה, לקיבוץ לקוחות קשורים. המערכת עצמה בעברית ובאנגלית.",
  },
];

export function clinicSplashCopy(lang: UiLanguage): ClinicSplashCopy {
  if (lang === "he") {
    return {
      productName: "ניהול קליניקה",
      kicker: "לקליניקה פרטית",
      pitch:
        "ניהול קליניקה פרטית במקום אחד: לקוחות, מפגשים, תיעוד, והכסף שנגבה. קובעים תורים, עוקבים אחרי קצב טיפול, ומפיקים קבלות בלי לצאת מהפרקטיקה.",
      sections: SECTIONS_HE,
      signIn: "התחברות",
      requestAccess: "בקשת גישה",
      formTitle: "בקשת גישה",
      formIntro: "השאירו פרטים ונחזור אליכם לפתיחת חשבון.",
      nameLabel: "שם",
      emailLabel: "אימייל",
      phoneLabel: "טלפון (לא חובה)",
      messageLabel: "הודעה (לא חובה)",
      submit: "שליחה",
      submitting: "שולחים…",
      cancel: "ביטול",
      success: "הבקשה נשלחה. נחזור אליכם.",
      errorInvalid: "בדקו את השם ואת האימייל ונסו שוב.",
      errorUnavailable: "לא הצלחנו לשלוח את הבקשה. נסו שוב מאוחר יותר.",
      errorGeneric: "לא הצלחנו לשלוח את הבקשה. נסו שוב.",
      languageLabel: "שפה",
      close: "סגירה",
    };
  }
  return {
    productName: "Clinic management",
    kicker: "For private practices",
    pitch:
      "Run a private clinic in one place: clients, visits, notes, and the money you collect. Book sessions, follow a planned cadence, and issue receipts without leaving the practice.",
    sections: SECTIONS_EN,
    signIn: "Sign in",
    requestAccess: "Request access",
    formTitle: "Request access",
    formIntro: "Leave your details and we will get back to you about an account.",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone (optional)",
    messageLabel: "Message (optional)",
    submit: "Send",
    submitting: "Sending…",
    cancel: "Cancel",
    success: "Request sent. We'll be in touch.",
    errorInvalid: "Check the name and email, then try again.",
    errorUnavailable: "We couldn't send the request. Try again later.",
    errorGeneric: "We couldn't send the request. Try again.",
    languageLabel: "Language",
    close: "Close",
  };
}
