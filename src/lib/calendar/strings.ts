import type { CalendarEventKind } from "@/lib/calendar/model";
import type { UiLanguage } from "@/lib/ui-language";

export type CalendarCopy = {
  title: string;
  intro: string;
  day: string;
  week: string;
  month: string;
  today: string;
  previous: string;
  next: string;
  jumpToDate: string;
  overdueTitle: string;
  /** "+{n} more" */
  more: string;
  close: string;
  open: string;
  scheduleAppointment: string;
  logTreatment: string;
  reschedule: string;
  reportTreatment: string;
  /** "Last visit: {date}" */
  lastVisit: string;
  noLastVisit: string;
  scheduledTask: string;
  dueTask: string;
  empty: string;
  allDay: string;
  kinds: Record<CalendarEventKind, string>;
};

export function calendarStrings(lang: UiLanguage): CalendarCopy {
  if (lang === "he") {
    return {
      title: "יומן",
      intro: "תורים וביקורים מהקליניקה, יחד עם מועדים, תורים רפואיים, משימות וחידושים מניהול הבית.",
      day: "יום",
      week: "שבוע",
      month: "חודש",
      today: "היום",
      previous: "הקודם",
      next: "הבא",
      jumpToDate: "מעבר לתאריך",
      overdueTitle: "ביקורים באיחור",
      more: "+{n} נוספים",
      close: "סגירה",
      open: "פתיחה",
      scheduleAppointment: "קביעת תור",
      logTreatment: "דיווח טיפול",
      reschedule: "דחיית תור",
      reportTreatment: "דיווח טיפול",
      lastVisit: "ביקור אחרון: {date}",
      noLastVisit: "אין ביקור קודם",
      scheduledTask: "מתוזמן",
      dueTask: "יעד",
      empty: "אין אירועים בטווח הזה.",
      allDay: "כל היום",
      kinds: {
        clinicAppointment: "תור בקליניקה",
        clinicVisit: "ביקור משוער",
        familyDate: "מועד משפחתי",
        medical: "תור רפואי",
        task: "משימה",
        renewal: "חידוש",
      },
    };
  }
  return {
    title: "Calendar",
    intro: "Clinic appointments and upcoming visits, together with family dates, medical appointments, tasks, and renewals from Home Management.",
    day: "Day",
    week: "Week",
    month: "Month",
    today: "Today",
    previous: "Previous",
    next: "Next",
    jumpToDate: "Jump to date",
    overdueTitle: "Overdue visits",
    more: "+{n} more",
    close: "Close",
    open: "Open",
    scheduleAppointment: "Schedule appointment",
    logTreatment: "Log treatment",
    reschedule: "Reschedule",
    reportTreatment: "Report treatment",
    lastVisit: "Last visit: {date}",
    noLastVisit: "No previous visit",
    scheduledTask: "Scheduled",
    dueTask: "Due",
    empty: "Nothing in this range.",
    allDay: "All day",
    kinds: {
      clinicAppointment: "Clinic appointment",
      clinicVisit: "Estimated visit",
      familyDate: "Family date",
      medical: "Medical appointment",
      task: "Task",
      renewal: "Renewal",
    },
  };
}
