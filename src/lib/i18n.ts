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
      upcoming: "Upcoming",
      notReimbursed: "Not reimbursed",
      reimbursed: "Reimbursed",
      noMatchingAppointments: "No appointments in this filter.",
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
      upcoming: "קרוב",
      notReimbursed: "ממתין להחזר",
      reimbursed: "הוחזר",
      noMatchingAppointments: "אין תורים במסנן זה.",
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
