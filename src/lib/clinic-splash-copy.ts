import type { UiLanguage } from "@/lib/ui-language";

export type ClinicSplashFeature = {
  title: string;
  body: string;
};

export type ClinicSplashCopy = {
  productName: string;
  kicker: string;
  pitch: string;
  features: ClinicSplashFeature[];
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

const FEATURES_EN: ClinicSplashFeature[] = [
  {
    title: "Clients and schedule",
    body: "Clients, appointments, and upcoming visits from a planned cadence.",
  },
  {
    title: "Session notes",
    body: "Record treatments and transcribe audio in English or Hebrew.",
  },
  {
    title: "Receipts",
    body: "Tie payments to treatments, consultations, and travel, including Morning (Green Invoice).",
  },
  {
    title: "Google Calendar",
    body: "Push appointments one way from the clinic to your calendar.",
  },
  {
    title: "The practice, in view",
    body: "Reminders, reports, and a clinic income view.",
  },
  {
    title: "Your language",
    body: "The app itself in Hebrew and English.",
  },
];

const FEATURES_HE: ClinicSplashFeature[] = [
  {
    title: "לקוחות ולוח זמנים",
    body: "לקוחות, תורים, וביקורים קרובים לפי קצב טיפול מתוכנן.",
  },
  {
    title: "תיעוד מפגשים",
    body: "רישום טיפולים ותמלול הקלטות בעברית או באנגלית.",
  },
  {
    title: "קבלות",
    body: "שיוך תשלומים לטיפולים, לייעוצים ולנסיעות, כולל מורנינג (חשבונית ירוקה).",
  },
  {
    title: "Google Calendar",
    body: "דחיפת תורים בכיוון אחד מהקליניקה אל היומן.",
  },
  {
    title: "הפרקטיקה במבט אחד",
    body: "תזכורות, דוחות, ותצוגת הכנסות הקליניקה.",
  },
  {
    title: "השפה שלכם",
    body: "המערכת עצמה בעברית ובאנגלית.",
  },
];

export function clinicSplashCopy(lang: UiLanguage): ClinicSplashCopy {
  if (lang === "he") {
    return {
      productName: "ניהול קליניקה",
      kicker: "לקליניקה פרטית",
      pitch: "ניהול קליניקה פרטית במקום אחד: לקוחות, מפגשים, תיעוד ותשלומים.",
      features: FEATURES_HE,
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
    pitch: "Run a private clinic in one place: clients, visits, notes, and payments.",
    features: FEATURES_EN,
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
