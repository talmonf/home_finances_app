import type { UiLanguage } from "@/lib/ui-language";

export type ClinicSplashSection = {
  id: string;
  title: string;
  body: string;
};

export type ClinicSplashCopy = {
  productName: string;
  kicker: string;
  pitch: string;
  sections: ClinicSplashSection[];
  signIn: string;
  requestAccess: string;
  requestDemo: string;
  formTitle: string;
  formIntro: string;
  demoFormTitle: string;
  demoFormIntro: string;
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
    title: "The week, already arranged",
    body: "Booked appointments and the rhythm of each client live in one place. The next visit is waiting when a course of treatment has its own pace, so the diary is no longer a separate system.",
  },
  {
    id: "notes",
    title: "The session, while it is still clear",
    body: "A treatment, its files, and a short spoken summary — transcribed in Hebrew or English — stay with the client. Your notes keep the shape of how you actually write.",
  },
  {
    id: "paid",
    title: "Work and payment, side by side",
    body: "Sessions, consultations, and travel sit next to the receipts that collected them. You can see what was done and what was paid without reconstructing the month.",
  },
  {
    id: "morning",
    title: "Receipts through Morning",
    body: "Morning (Green Invoice) can issue the receipt and assign the number for you. Your own receipt book remains there when a payment should stay outside Morning.",
  },
  {
    id: "calendar",
    title: "On your calendar, and in your inbox",
    body: "Appointments reach Google Calendar when you create, move, or cancel them. A digest email brings the coming appointments and visits to you, before you open the app.",
  },
  {
    id: "practice",
    title: "A whole practice, not a pile of tools",
    body: "Service lines, clients, consultations, expenses, travel, petrol, insurance, and professional subscriptions sit with reminders, reports, and a view of income. Families can group related clients. Bring an existing workbook with you. The clinic itself is in Hebrew and English.",
  },
];

const SECTIONS_HE: ClinicSplashSection[] = [
  {
    id: "day",
    title: "השבוע, כבר מסודר",
    body: "תורים שנקבעו והקצב של כל לקוח נמצאים במקום אחד. הביקור הבא מחכה כשלסדרת טיפולים יש קצב משלה, כך שהיומן כבר לא מערכת נפרדת.",
  },
  {
    id: "notes",
    title: "המפגש, כל עוד הוא ברור",
    body: "טיפול, הקבצים שלו, וסיכום קצר שנאמר בקול — מתומלל בעברית או באנגלית — נשארים עם הלקוח. ההערות שומרות על הצורה שבה באמת כותבים.",
  },
  {
    id: "paid",
    title: "עבודה ותשלום, זה לצד זה",
    body: "מפגשים, ייעוצים ונסיעות יושבים ליד הקבלות שגבו אותם. רואים מה נעשה ומה שולם בלי לשחזר את החודש.",
  },
  {
    id: "morning",
    title: "קבלות דרך Morning",
    body: "Morning (חשבונית ירוקה) יכול להפיק את הקבלה ולהקצות את המספר. פנקס הקבלות שלכם נשאר שם כשתשלום צריך להישאר מחוץ ל-Morning.",
  },
  {
    id: "calendar",
    title: "ביומן, ובתיבת הדואר",
    body: "תורים מגיעים ל-Google Calendar כשיוצרים, מזיזים או מבטלים אותם. אימייל סיכום מביא את התורים והביקורים הקרובים, עוד לפני שפותחים את המערכת.",
  },
  {
    id: "practice",
    title: "פרקטיקה שלמה, לא אוסף כלים",
    body: "קווי שירות, לקוחות, ייעוצים, הוצאות, נסיעות, דלק, ביטוח ומנויים מקצועיים יושבים עם תזכורות, דוחות ומבט על ההכנסות. אפשר לקבץ לקוחות קשורים כמשפחה. מביאים איתכם חוברת קיימת. הקליניקה עצמה בעברית ובאנגלית.",
  },
];

export function clinicSplashCopy(lang: UiLanguage): ClinicSplashCopy {
  if (lang === "he") {
    return {
      productName: "ניהול קליניקה",
      kicker: "לקליניקה פרטית",
      pitch:
        "קליניקה פרטית במקום אחד: את מי פוגשים, מתי, מה נכתב, ומה שולם. יומן, תיעוד וגבייה שנשארים יחד, כולל קבלות דרך Morning.",
      sections: SECTIONS_HE,
      signIn: "התחברות",
      requestAccess: "בקשת גישה",
      requestDemo: "בקשת הדגמה",
      formTitle: "בקשת גישה",
      formIntro: "השאירו פרטים ונחזור אליכם לפתיחת חשבון.",
      demoFormTitle: "בקשת הדגמה",
      demoFormIntro: "השאירו פרטים ונתאם הדגמה של הקליניקה.",
      nameLabel: "שם",
      emailLabel: "אימייל",
      phoneLabel: "טלפון (לא חובה)",
      messageLabel: "הערה (לא חובה)",
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
      "A private clinic in one place: who you see, when, what you wrote, and what you were paid. The diary, the notes, and the money stay together, including receipts through Morning.",
    sections: SECTIONS_EN,
    signIn: "Sign in",
    requestAccess: "Request access",
    requestDemo: "Request a demo",
    formTitle: "Request access",
    formIntro: "Leave your details and we will get back to you about an account.",
    demoFormTitle: "Request a demo",
    demoFormIntro: "Leave your details and we will arrange a walkthrough of the clinic.",
    nameLabel: "Name",
    emailLabel: "Email",
    phoneLabel: "Phone (optional)",
    messageLabel: "Note (optional)",
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
