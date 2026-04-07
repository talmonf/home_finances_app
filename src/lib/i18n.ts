import type { UiLanguage } from "@/lib/ui-language";

const STRINGS = {
  en: {
    common: {
      save: "Save",
      add: "Add",
      edit: "Edit",
      cancel: "Cancel",
      none: "None",
      notSpecified: "Not specified yet",
      backToDashboard: "Back to dashboard",
    },
    medical: {
      title: "Medical appointments",
      addAppointment: "Add appointment",
      history: "History",
    },
    donations: {
      title: "Donations",
      addDonation: "Add donation",
      recordedDonations: "Recorded donations",
    },
  },
  he: {
    common: {
      save: "שמירה",
      add: "הוספה",
      edit: "עריכה",
      cancel: "ביטול",
      none: "ללא",
      notSpecified: "טרם צוין",
      backToDashboard: "חזרה ללוח הבקרה",
    },
    medical: {
      title: "תורים רפואיים",
      addAppointment: "הוספת תור",
      history: "היסטוריה",
    },
    donations: {
      title: "תרומות",
      addDonation: "הוספת תרומה",
      recordedDonations: "תרומות שנרשמו",
    },
  },
} as const;

export function getI18n(language: UiLanguage) {
  return STRINGS[language];
}
