import { PRIVATE_CLINIC_NAV_ITEMS, type PrivateClinicNavKey } from "@/lib/private-clinic-nav";
import type { TherapyPaymentStatus } from "@/lib/therapy/payment";
import type { UiLanguage } from "@/lib/ui-language";

const NAV_LABELS_HE: Record<PrivateClinicNavKey, string> = {
  overview: "סקירה",
  jobs: "משרות",
  programs: "תוכניות",
  clients: "לקוחות",
  families: "משפחות",
  upcomingVisits: "ביקורים קרובים",
  treatments: "טיפולים",
  receipts: "קבלות",
  reports: "דוחות",
  expenses: "הוצאות",
  appointments: "תורים",
  consultations: "ייעוצים",
  travel: "נסיעות",
  petrol: "דלק",
  clinicInsurance: "ביטוח קליניקה",
  workSubscriptions: "מנויים מקצועיים",
  reminders: "תזכורות",
  settings: "הגדרות",
  importExport: "יבוא / ייצוא",
  gettingStarted: "מדריך למשתמש",
};

/** Bilingual helper for Clinic UI */
export function pc(lang: UiLanguage, en: string, he: string): string {
  return lang === "he" ? he : en;
}

export function privateClinicNavLabel(key: PrivateClinicNavKey, lang: UiLanguage): string {
  if (lang === "he") return NAV_LABELS_HE[key];
  return PRIVATE_CLINIC_NAV_ITEMS.find((i) => i.key === key)?.label ?? key;
}

export function privateClinicLayoutStrings(lang: UiLanguage) {
  if (lang === "he") {
    return {
      backToDashboard: "חזרה ללוח הבקרה →",
      title: "קליניקה",
      description:
        "ניהול לקוחות, מפגשים, קבלות והוצאות קליניקה לפי משרה.",
      navAriaLabel: "אזורים בקליניקה",
      moreMenuLabel: "עוד",
    };
  }
  return {
    backToDashboard: "← Back to dashboard",
    title: "Clinic",
    description: "Manage clients, sessions, receipts, and clinic expenses per employment job.",
    navAriaLabel: "Clinic sections",
    moreMenuLabel: "More",
  };
}

export type PrivateClinicOverviewStatId =
  | "activeClients"
  | "treatments"
  | "receipts"
  | "expenses"
  | "appointments"
  | "upcomingVisits"
  | "consultations"
  | "travel";

/** Nav tab key for an overview stat tile — must match `getVisiblePrivateClinicNavItems` keys. */
export function privateClinicOverviewStatNavKey(id: PrivateClinicOverviewStatId): PrivateClinicNavKey {
  if (id === "activeClients") return "clients";
  return id as PrivateClinicNavKey;
}

export function privateClinicOverviewCardLabel(id: PrivateClinicOverviewStatId, lang: UiLanguage): string {
  if (lang === "he") {
    const he: Record<PrivateClinicOverviewStatId, string> = {
      activeClients: "לקוחות פעילים",
      treatments: "טיפולים (מאז ומתמיד)",
      receipts: "קבלות",
      expenses: "הוצאות קליניקה",
      appointments: "תורים קרובים",
      upcomingVisits: "ביקורים קרובים",
      consultations: "ייעוצים שתועדו",
      travel: "רישומי נסיעות",
    };
    return he[id];
  }
  const en: Record<PrivateClinicOverviewStatId, string> = {
    activeClients: "Active clients",
    treatments: "Treatments (all time)",
    receipts: "Receipts",
    expenses: "Clinic expenses",
    appointments: "Upcoming appointments",
    upcomingVisits: "Upcoming visits",
    consultations: "Consultations logged",
    travel: "Travel entries",
  };
  return en[id];
}

export function privateClinicOverviewStrings(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    overdueCount: (count: number) =>
      p(`${count} overdue`, `${count} באיחור`),
    noJobsTitle: p("Set up your first clinic job", "הגדירו תחילה משרת קליניקה"),
    noJobsDescription: p(
      "No clinic jobs are defined yet. Start by creating a job, then return to the overview.",
      "עדיין לא הוגדרו משרות קליניקה. התחילו ביצירת משרה, ולאחר מכן חזרו למסך הסקירה.",
    ),
    goToJobs: p("Go to Jobs", "מעבר למשרות"),
  };
}

export function privateClinicCommon(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    saved: p("Saved.", "נשמר."),
    deleted: p("Record removed.", "הרשומה הוסרה."),
    fillUpSaved: p("Fill-up saved.", "תדלוק נשמר."),
    noFamilyMemberBanner: p(
      "Your account setup is incomplete. Complete setup to manage clients.",
      "הגדרת החשבון אינה מלאה. השלימו את ההגדרה כדי לנהל לקוחות.",
    ),
    noFamilyMemberJobs: p(
      "Your account setup is incomplete. Complete setup to manage clinic jobs.",
      "הגדרת החשבון אינה מלאה. השלימו את ההגדרה כדי לנהל משרות קליניקה.",
    ),
    saveFailedGeneric: p(
      "Could not save job. Please review the fields and try again.",
      "לא ניתן לשמור את המשרה. בדקו את השדות ונסו שוב.",
    ),
    noJobsYet: p("No jobs yet.", "אין עדיין משרות."),
    active: p("Active", "פעיל"),
    inactive: p("Inactive", "לא פעיל"),
    present: p("Present", "נוכחי"),
    notes: p("Notes", "הערות"),
    save: p("Save", "שמירה"),
    delete: p("Delete", "מחיקה"),
    edit: p("Edit", "עריכה"),
    cancel: p("Cancel", "ביטול"),
    remove: p("Remove", "הסרה"),
    add: p("Add", "הוספה"),
    yes: p("Yes", "כן"),
    no: p("No", "לא"),
    none: p("None", "ללא"),
    job: p("Job", "משרה"),
    program: p("Program", "תכנית"),
    client: p("Client", "לקוח"),
    category: p("Category", "קטגוריה"),
    amount: p("Amount", "סכום"),
    total: p("Total", "סה״כ"),
    records: p("records", "רשומות"),
    currency: p("Currency", "מטבע"),
    type: p("Type", "סוג"),
    status: p("Status", "סטטוס"),
    name: p("Name", "שם"),
    date: p("Date", "תאריך"),
    dateTime: p("Date & time", "תאריך ושעה"),
    from: p("From", "מ"),
    to: p("To", "עד"),
    apply: p("Apply", "החל"),
    /** Short label next to Apply on filter forms */
    filterReset: p("Reset", "איפוס"),
    selectAll: p("Select all", "בחירת הכל"),
    deselectAll: p("Deselect all", "ניקוי בחירה"),
    filterDone: p("Done", "סיום"),
    filterCloseHint: p("Or click the filter field again to close.", "או לחצו שוב על שדה הסינון לסגירה."),
    all: p("All", "הכל"),
    any: p("Any", "כלשהו"),
    anyF: p("Any", "כלשהי"),
    select: p("Select", "בחירה"),
    noRowsMatch: p("No rows match.", "אין רשומות מתאימות."),
    noEntriesYet: p("No entries yet.", "אין עדיין רשומות."),
    linkBankOptional: p("Link bank transaction (optional)", "קישור לתנועת בנק (אופציונלי)"),
    txNoneLinked: p("None (not linked)", "ללא (לא מקושר)"),
    noDate: p("No date", "ללא תאריך"),
    treatment: p("Treatment", "טיפול"),
    treatmentsWord: p("Treatments", "טיפולים"),
    when: p("When", "מתי"),
    paid: p("Paid", "שולם"),
    employer: p("Employer", "מעסיק"),
    startDate: p("Start date", "תאריך התחלה"),
    endDate: p("End date", "תאריך סיום"),
    defaultSessionLengthMinutes: p(
      "Default session length (minutes)",
      "אורך מפגש ברירת מחדל (דקות)",
    ),
    description: p("Description (optional)", "תיאור (אופציונלי)"),
    sortOrderHint: p(
      "Lower values appear first (for example: 10, 20, 30). Leave empty to use 0.",
      "ערכים נמוכים מוצגים ראשונים (למשל: 10, 20, 30). השאירו ריק ל־0.",
    ),
    sortOrderPh: p("Sort order (optional)", "סדר מיון (אופציונלי)"),
    programsEmpty: p(
      "No programs yet. Add a job under Jobs, then define programs here.",
      "אין עדיין תוכניות. הוסיפו משרה תחת משרות, ואז הגדירו תוכניות כאן.",
    ),
    programsNoFm: p(
      "Your account setup is incomplete, so jobs cannot be loaded.",
      "הגדרת החשבון אינה מלאה, ולכן לא ניתן לטעון משרות.",
    ),
    tableSort: p("Sort", "סדר"),
    tableDelete: p("Delete", "מחיקה"),
    clientsEmpty: p("No clients yet.", "אין עדיין לקוחות."),
    expensesEmpty: p("No expenses yet.", "אין עדיין הוצאות."),
    receiptsEmpty: p("No receipts yet.", "אין עדיין קבלות."),
    travelEmpty: p("No travel entries yet.", "אין עדיין רישומי נסיעה."),
    editDelete: p("Edit / delete", "עריכה / מחיקה"),
    saveExpense: p("Save expense", "שמירת הוצאה"),
    deleteExpense: p("Delete expense", "מחיקת הוצאה"),
    carDetailsLink: p("Car details & services", "פרטי רכב ושירותים"),
    allCars: p("All cars", "כל הרכבים"),
    selectVehiclePrompt: p(
      "Select a vehicle above to log a fill-up and see history.",
      "בחרו רכב למעלה כדי לרשום תדלוק ולראות היסטוריה.",
    ),
    couldNotLoadFillup: p("That fill-up could not be loaded.", "לא ניתן לטעון את רשומת התדלוק."),
    clearEdit: p("Clear edit", "נקה עריכה"),
    recentFillUps: p("Recent fill-ups", "תדלוקים אחרונים"),
    tankedBy: p("Tanked by", "תדלק על ידי"),
    bankTx: p("Bank tx", "תנועת בנק"),
    linked: p("Linked", "מקושר"),
    defaultFeesByVisitType: p("Default session fees by visit type", "תעריפי ברירת מחדל לפי סוג ביקור"),
    defaultFeesByVisitTypeHint: p(
      "Used when logging a treatment. Program defaults override job defaults.",
      "משמש בעת רישום טיפול. ברירות מחדל לתכנית גוברות על ברירות המחדל של המשרה.",
    ),
    saveDefaults: p("Save defaults", "שמירת ברירות מחדל"),
    filteredByReceipt: (receiptNumber: string) =>
      p(`Filtered by receipt #${receiptNumber}`, `סינון לפי קבלה #${receiptNumber}`),
  };
}

export function employmentTypeOptionLabel(lang: UiLanguage, t: string): string {
  const p = (en: string, he: string) => pc(lang, en, he);
  switch (t) {
    case "employee":
      return p("Regular employee", "שכיר רגיל");
    case "freelancer":
      return p("Freelancer", "עצמאי (פרילנסר)");
    case "self_employed":
      return p("Self-employed", "עצמאי");
    case "contractor_via_company":
      return p("Contractor via company", "קבלן דרך חברה");
    default:
      return t;
  }
}

export function treatmentPaymentStatusLabel(lang: UiLanguage, st: TherapyPaymentStatus): string {
  const p = (en: string, he: string) => pc(lang, en, he);
  if (st === "paid") return p("paid", "שולם במלואו");
  if (st === "partial") return p("partial", "חלקי");
  return p("unpaid", "לא שולם");
}

export function weekdayLongLabel(lang: UiLanguage, day: number): string {
  const en = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const he = ["יום ראשון", "יום שני", "יום שלישי", "יום רביעי", "יום חמישי", "יום שישי", "שבת"];
  return lang === "he" ? he[day] ?? String(day) : en[day] ?? String(day);
}

export function privateClinicJobs(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    addJobTitle: p("Add job", "הוספת משרה"),
    addJobBtn: p("Add job", "הוספת משרה"),
    jobsHeading: p("Jobs", "משרות"),
    editJobPageTitle: p("Edit job", "עריכת משרה"),
    backToJobs: p("Back to jobs", "חזרה לרשימת משרות"),
    colActions: p("Actions", "פעולות"),
    tableJob: c.job,
    tableEmploymentType: p("Employment type", "סוג העסקה"),
    tableExternalReportingSystem: p("External reporting system", "מערכת דיווח חיצונית"),
    tableDateRange: p("Date range", "טווח תאריכים"),
    tableActive: c.active,
    employmentType: p("Employment type", "סוג העסקה"),
    jobTitle: p("Job title", "תפקיד"),
    employerOptional: p("Employer (optional)", "מעסיק (אופציונלי)"),
    externalReportingSystemOptional: p(
      "External reporting system (optional)",
      "מערכת דיווח חיצונית (אופציונלי)",
    ),
    employerTaxOptional: p("Employer tax number (optional)", "מספר עוסק מעסיק (אופציונלי)"),
    employerAddressOptional: p("Employer address (optional)", "כתובת מעסיק (אופציונלי)"),
    saveJob: c.save,
    employedPerson: p("Employed person", "עובד/ת"),
    employedPersonHelp: p(
      "Each job must be tied to someone in your account list.",
      "כל משרה חייבת להיות משויכת לאדם מרשימת החשבון.",
    ),
    invalidEmployedPerson: p("Choose a valid employed person.", "בחרו עובד/ת תקין/ה."),
    needMemberBeforeJob: p(
      "Add at least one person before you can add a job.",
      "הוסיפו לפחות אדם אחד לפני הוספת משרה.",
    ),
    privateClinicRole: p("Clinic role", "סיווג לקליניקה"),
    privateClinicRoleHelp: p(
      "On: this job appears in the Clinic module; receipts default to clients and bank matching is lenient. Off: hidden from clinic lists/forms; receipts default to organization and bank matching is strict.",
      "פעיל: המשרה מופיעה במודול הקליניקה; קבלות ברירת מחדל ללקוחות והתאמת חשבון בנק מקלה. כבוי: מוסתרת מרשימות/טפסים של הקליניקה; קבלות ארגוניות והתאמת בנק מחמירה.",
    ),
    clinicUnlinkedHint: p(
      "Clinic can still be used for this account. When adding a job, choose who this role belongs to.",
      "עדיין אפשר להשתמש בקליניקה בחשבון זה. בעת הוספת משרה, בחרו למי התפקיד שייך.",
    ),
    noJobsInHousehold: p("No jobs in this household yet. Add one above.", "אין עדיין משרות במשקה. הוסיפו למעלה."),
    noPrivateClinicJobsFiltered: p(
      "No jobs are marked for the Clinic module. Turn on “Include in Clinic module” on Dashboard → Jobs (or enable “Clinic role” here when adding a job).",
      "אין משרות שמסומנות למודול הקליניקה. הפעילו ״כלול במודול הקליניקה״ בלוח הבקרה ← משרות (או סמנו ״סיווג לקליניקה״ כאן בעת הוספת משרה).",
    ),
  };
}

export function privateClinicPrograms(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    addProgramTitle: p("Add program", "הוספת תכנית"),
    addProgramBtn: p("Add program", "הוספת תכנית"),
    programsHeading: p("Programs", "תוכניות"),
    editProgramPageTitle: p("Edit program", "עריכת תכנית"),
    backToPrograms: p("Back to programs", "חזרה לרשימת תוכניות"),
    colActions: p("Actions", "פעולות"),
    programErrMissing: p("Select a job and enter a program name.", "יש לבחור משרה ולהזין שם תכנית."),
    programErrJob: p("That job is not available for your account.", "המשרה אינה זמינה לחשבון שלך."),
    programErrNotfound: p("Program not found.", "התכנית לא נמצאה."),
    programErrId: p("Invalid program.", "תכנית לא תקינה."),
    programErrLinked: p(
      "Program cannot be deleted because it is linked to existing records.",
      "לא ניתן למחוק את התכנית כי היא מקושרת לרשומות קיימות.",
    ),
    programName: p("Program name", "שם תכנית"),
    visitFrequency: p("Visit frequency", "תדירות ביקורים"),
    visitFrequencyHint: p(
      "Optional. Used as the default when you add a client with this program selected.",
      "אופציונלי. משמש ברירת מחדל בעת הוספת לקוח עם תכנית זו.",
    ),
    visitsPer: p("Visits per", "ביקורים בכל"),
    weeks: p("week(s)", "שבוע/ות"),
    supportedVisitTypes: p("Supported visit types", "סוגי ביקור נתמכים"),
    supportedVisitTypesHint: p(
      "Used to indicate which visit modes this program supports.",
      "משמש לציון אילו סוגי ביקור נתמכים בתכנית זו.",
    ),
    visitClinic: p("Clinic", "קליניקה"),
    visitHome: p("Home", "בית"),
    visitPhone: p("Phone", "טלפון"),
    visitVideo: p("Video", "וידאו"),
    active: c.active,
    tableName: c.name,
    tableJob: c.job,
    tableSort: c.tableSort,
    tableActive: c.active,
    tableDelete: c.tableDelete,
  };
}

export function privateClinicClients(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    addClientTitle: p("Add Client", "הוספת לקוח"),
    addClientBtn: p("Add Client", "הוספת לקוח"),
    clientsHeading: p("Clients", "לקוחות"),
    firstName: p("First name", "שם פרטי"),
    lastNameOptional: p("Last name (optional)", "שם משפחה (אופציונלי)"),
    idOptional: p("ID (optional)", "ת״ז (אופציונלי)"),
    email: p("Email", "דוא״ל"),
    composeEmail: p("Compose", "כתיבת דוא״ל"),
    callNumber: p("Call", "חיוג"),
    mobilePhone: p("Mobile phone", "טלפון נייד"),
    homePhone: p("Home phone", "טלפון בית"),
    address: p("Address", "כתובת"),
    visitFrequency: p("Visit frequency", "תדירות ביקורים"),
    visitFrequencyClientHint: p(
      "Optional. Leave blank to inherit from the default program (if it defines one).",
      "אופציונלי. השאירו ריק כדי לרשת מתכנית ברירת המחדל (אם הוגדרה שם).",
    ),
    visitsPer: p("Visits per", "ביקורים בכל"),
    weeks: p("week(s)", "שבוע/ות"),
    disabilityStatus: p("Disability status", "סטטוס נכות"),
    rehabBasketStatus: p("Rehabilitation basket status", "סטטוס סל שיקום"),
    statusNone: p("None", "אין"),
    statusExists: p("Exists", "קיים"),
    statusFiledInHospitalization: p("Filed during hospitalization", "הוגש באשפוז"),
    statusFiledRecognized: p("Filed and recognized", "הוגש והוכר"),
    statusFiledRejected: p("Filed and rejected", "הוגש ונדחה"),
    statusFiledAppeal: p("Appeal filed", "הוגש ערעור"),
    statusFiledWorsening: p("Worsening filed", "הוגש החמרה"),
    saveClient: p("Save client", "שמירת לקוח"),
    defaultJob: p("Default job", "משרה ברירת מחדל"),
    defaultProgramOptional: p("Default program (optional)", "תכנית ברירת מחדל (אופציונלי)"),
    defaultVisitTypeOptional: p("Default visit type (optional)", "סוג ביקור ברירת מחדל (אופציונלי)"),
    kupatHolimOptional: p("Kupat Holim (optional)", "קופת חולים (אופציונלי)"),
    kupatClalit: p("Clalit", "כללית"),
    kupatMaccabi: p("Maccabi", "מכבי"),
    kupatMeuhedet: p("Meuhedet", "מאוחדת"),
    kupatLeumit: p("Leumit", "לאומית"),
    visitClinic: p("Clinic", "קליניקה"),
    visitHome: p("Home", "בית"),
    visitPhone: p("Phone", "טלפון"),
    visitVideo: p("Video", "וידאו"),
    selectJob: p("Select job", "בחרו משרה"),
    alsoSeenUnder: p(
      "Also seen under these jobs (includes default)",
      "מופיע גם תחת המשרות הבאות (כולל ברירת המחדל)",
    ),
    endDate: p("End date (optional)", "תאריך סיום (אופציונלי)"),
    endReason: p("End reason", "סיבת סיום"),
    statusLabel: p("Status: Active", "סטטוס: פעיל"),
    statusHelp: p(
      "Uncheck for inactive — client is hidden from default lists and end-date reminders are not shown.",
      "בטלו סימון ללקוח לא פעיל — לא יופיע ברשימות ברירת מחדל ולא יוצגו תזכורות לפי תאריך סיום.",
    ),
    filters: p("Filters", "סינון"),
    filterSearchLabel: p("Search", "חיפוש"),
    filterSearchPlaceholder: p("Name or ID number", "שם או מספר ת״ז"),
    filterStatusLabel: p("Status", "סטטוס"),
    filterStatusAll: p("All clients", "כל הלקוחות"),
    filterStatusActiveOnly: p("Active only", "פעילים בלבד"),
    filterStatusInactiveOnly: p("Inactive only", "לא פעילים בלבד"),
    filterJobLabel: p("Job (default or linked)", "משרה (ברירת מחדל או מקושרת)"),
    filterJobAny: p("Any job", "כל משרה"),
    filterProgramLabel: p("Program", "תכנית"),
    filterProgramAny: p("Any program", "כל תכנית"),
    filterFamilyLabel: p("Family", "משפחה"),
    filterFamilyAny: p("Any family", "כל משפחה"),
    filterDateRangeHelp: p(
      "When both dates are set, only clients whose start–end span overlaps that range are shown (open dates count as unbounded).",
      "כששני התאריכים מלאים, יוצגו לקוחות שטווח התחלה–סיום שלהם חופף לטווח (תאריך ריק נחשב ללא גבול).",
    ),
    newClientPageTitle: p("New client", "לקוח חדש"),
    editClientPageTitle: p("Edit client", "עריכת לקוח"),
    backToClients: p("Back to clients", "חזרה לרשימת לקוחות"),
    sortHintAsc: p("Ascending", "סדר עולה"),
    sortHintDesc: p("Descending", "סדר יורד"),
    colClientName: p("First name", "שם פרטי"),
    colLastName: p("Last name", "שם משפחה"),
    colJob: p("Default job", "משרת ברירת מחדל"),
    colProgram: p("Default program", "תכנית ברירת מחדל"),
    colKupatHolim: p("Kupat Holim", "קופת חולים"),
    colFamily: p("Family", "משפחה"),
    colTreatmentsCount: p("# treatments", "מס׳ טיפולים"),
    colNextVisitDue: p("Next visit", "הביקור הבא"),
    nextVisitScheduledLabel: p("Scheduled", "מתוזמן"),
    nextVisitEstimatedLabel: p("Estimated", "משוער"),
    nextVisitScheduledTitle: (dateText: string) => p(`Scheduled appointment: ${dateText}`, `תור מתוזמן: ${dateText}`),
    nextVisitEstimatedTitle: (dateText: string) =>
      p(`Estimated from frequency and last visit: ${dateText}`, `משוער לפי תדירות והביקור האחרון: ${dateText}`),
    nextVisitNoTreatments: p("No treatments logged", "אין טיפולים רשומים"),
    nextVisitNoFrequency: p("Set visit frequency", "הגדירו תדירות ביקורים"),
    colStart: p("Start", "התחלה"),
    colEnd: p("End", "סיום"),
    colActions: p("Actions", "פעולות"),
    errMissing: p("First name and default job are required.", "נדרשים שם פרטי ומשרת ברירת מחדל."),
    errJob: p("That job is not available for your account.", "המשרה אינה זמינה לחשבון שלך."),
    errProgram: p("Default program must belong to the default job.", "תכנית ברירת המחדל חייבת להשתייך למשרת ברירת המחדל."),
    errVisitType: p("Default visit type is invalid.", "סוג ביקור ברירת המחדל אינו תקין."),
    agreedFeeOptional: p("Agreed fee (optional)", "שכר מוסכם (אופציונלי)"),
    agreedFeeCurrency: p("Currency", "מטבע"),
    defaultPaymentMethodOptional: p("Default payment method (optional)", "אמצעי תשלום ברירת מחדל (אופציונלי)"),
    personalClientBillingHint: p(
      "For personal clients (not in a family). Used as defaults when logging a treatment.",
      "ללקוחות אישיים (ללא משפחה). משמש כברירת מחדל בעת רישום טיפול.",
    ),
    errNotfound: p("Client not found.", "הלקוח לא נמצא."),
    errRange: p("End date cannot be before start date.", "תאריך הסיום לא יכול להיות לפני תאריך ההתחלה."),
    errEndReason: p(
      "End reason is required when an end date is set for this program.",
      "סיבת סיום נדרשת כשמוגדר תאריך סיום לתכנית זו.",
    ),
    errSaveFailed: p("Could not save the client. Please try again.", "לא ניתן היה לשמור את הלקוח. נסו שוב."),
    errHasTreatments: p("Client cannot be deleted because treatments are associated with them.", "אי אפשר למחוק לקוח כי משויכים אליו טיפולים."),
    deleteClient: p("Delete client", "מחיקת לקוח"),
    deletingClient: p("Deleting client…", "מוחק לקוח…"),
    deleteClientConfirm: p("Delete this client permanently? This action cannot be undone.", "למחוק את הלקוח לצמיתות? פעולה זו אינה ניתנת לביטול."),
    clientRelationshipsTitle: p("Related clients", "לקוחות קשורים"),
    clientRelationshipsHelp: p(
      "For this client, each row names another client and how they relate — for example, “mother” means that person is this client’s mother; “referred by” means this client was referred by that person.",
      "עבור לקוח זה, כל שורה מציינת לקוח אחר ואת הקשר — למשל „אם״ משמעותה שהאדם הזה הוא האם של הלקוח; „הופנה על ידי״ משמעותה שהלקוח הופנה על ידי אותו אדם.",
    ),
    relColRelatedClient: p("Related client", "לקוח קשור"),
    relColRelationship: p("Relationship", "קשר"),
    relColActions: p("Actions", "פעולות"),
    relRemove: p("Remove", "הסרה"),
    relAdd: p("Add relationship", "הוספת קשר"),
    relSelectClient: p("Select client", "בחרו לקוח"),
    relSelectType: p("Relationship type", "סוג הקשר"),
    relMother: p("Mother", "אם"),
    relFather: p("Father", "אב"),
    relHusband: p("Husband", "בעל"),
    relWife: p("Wife", "אישה"),
    relReferredBy: p("Referred by", "הופנה על ידי"),
    relEmptyList: p("No related clients yet.", "אין עדיין לקוחות קשורים."),
    errRelMissing: p("Related client and relationship type are required.", "נדרשים לקוח קשור וסוג קשר."),
    errRelSelf: p("A client cannot be related to themselves.", "לא ניתן לקשר לקוח לעצמו."),
    errRelType: p("Relationship type is invalid.", "סוג הקשר אינו תקין."),
    errRelClient: p("That related client is not available for your account.", "הלקוח הקשור אינו זמין לחשבון שלך."),
    errRelDuplicate: p("That relationship is already recorded.", "הקשר הזה כבר רשום."),
    errRelNotfound: p("Relationship not found.", "הקשר לא נמצא."),
  };
}

export function privateClinicUpcomingVisits(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  const cl = privateClinicClients(lang);
  return {
    pageTitle: p("Upcoming visits", "ביקורים קרובים"),
    pageIntro: p(
      "Active clients with a visit frequency, ordered by estimated next visit after the last logged treatment.",
      "לקוחות פעילים עם תדירות ביקורים, ממוינים לפי מועד הביקור הבא המשוער אחרי הטיפול האחרון שרשמתם.",
    ),
    colClient: p("Client", "לקוח"),
    colLastVisit: p("Last visit", "ביקור אחרון"),
    colNextDue: cl.colNextVisitDue,
    colScheduled: p("Scheduled", "מתוזמן"),
    colOverdue: p("Overdue", "באיחור"),
    colJob: cl.colJob,
    colProgram: cl.colProgram,
    colKupatHolim: cl.colKupatHolim,
    colActions: cl.colActions,
    overdue: p("Overdue", "באיחור"),
    dueToday: p("Today", "היום"),
    logTreatment: p("Log treatment", "רישום טיפול"),
    scheduleAppointment: p("Schedule appointment", "תזמון תור"),
    scheduledOn: (dateText: string) => p(`Scheduled on ${dateText}`, `תור מתוזמן ל־${dateText}`),
    editClient: c.edit,
    sectionNeedsFirstVisit: p("No logged visits yet", "עדיין אין טיפולים רשומים"),
    sectionNeedsFirstVisitHint: p(
      "These clients have a visit frequency but no treatments on file — log a first visit to start the schedule.",
      "ללקוחות אלה יש תדירות ביקורים אבל עדיין אין טיפולים ברשומות — רשמו טיפול ראשון כדי להתחיל את לוח הזמנים.",
    ),
    empty: p(
      "No active clients with a visit frequency. Add a frequency on the client or program, or activate a client.",
      "אין לקוחות פעילים עם תדירות ביקורים. הגדירו תדירות בלקוח או בתכנית, או הפעילו לקוח.",
    ),
  };
}

export function privateClinicTreatments(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    filters: p("Filters", "סינון"),
    payment: p("Payment", "תשלום"),
    externalReporting: p("External reporting", "דיווח למערכת חיצונית"),
    filterAll: c.all,
    filterPaid: p("Paid", "שולם"),
    filterPartial: p("Partial", "חלקי"),
    filterUnpaid: p("Unpaid", "לא שולם"),
    filterReported: p("Reported", "דווח"),
    filterNotReported: p("Not reported", "לא דווח"),
    filterSelectedCountTemplate: p("{count} selected", "{count} נבחרו"),
    logTreatment: p("Log treatment", "רישום טיפול"),
    dateTime: c.dateTime,
    occurredTimeOptional: p("Time (optional, 24-hour, UTC)", "שעה (אופציונלי, 24 שעות, UTC)"),
    visitType: p("Visit type", "סוג ביקור"),
    saveTreatment: p("Save treatment", "שמירת טיפול"),
    treatmentsCount: (n: number) => p(`Treatments (${n})`, `טיפולים (${n})`),
    clinicIncomeLink: p("Link bank transaction — clinic income", "קישור לתנועת בנק — הכנסה מהקליניקה"),
    clinicIncomeHint: p(
      "Optional: link a credit/incoming payment that matches this session fee.",
      "אופציונלי: קישור לזכות/הכנסה שמתאימה לעלות המפגש.",
    ),
    paymentDate: p("Payment date", "תאריך תשלום"),
    paymentMethod: p("Payment method", "אמצעי תשלום"),
    paymentMethodUnset: p("Not set", "לא הוגדר"),
    paymentBankTransfer: p("Bank transfer", "העברה בנקאית"),
    paymentDigital: p("Digital payment", "תשלום דיגיטלי"),
    paymentCash: p("Cash", "מזומן"),
    paymentIntoAccount: p("Paid into account", "חשבון שאליו הופקד"),
    paymentDigitalApp: p("Digital method", "אפליקציה / אמצעי"),
    paymentDetailsCol: p("Payment date", "תאריך תשלום"),
    externalSystemCol: p("External system", "מערכת חיצונית"),
    reportedCol: p("Reported", "דווח"),
    markAsReported: p("Marked as reported", "סומן כדווח"),
    markAsNotReported: p("Not reported yet", "טרם דווח"),
    markReportedInExternalSystem: p(
      "Reported in external company system",
      "דווח במערכת החברה החיצונית",
    ),
    sortHintAsc: p("Ascending", "סדר עולה"),
    sortHintDesc: p("Descending", "סדר יורד"),
    treatmentsTitle: p("Treatments", "טיפולים"),
    addTreatmentBtn: p("Add treatment", "הוספת טיפול"),
    addTreatmentAttachmentHint: p(
      "You can add attachments after saving the treatment.",
      "ניתן להוסיף קבצים מצורפים אחרי שמירת הטיפול.",
    ),
    editTreatmentTitle: p("Edit treatment", "עריכת טיפול"),
    deleteTreatment: p("Delete treatment", "מחיקת טיפול"),
    deletingTreatment: p("Deleting...", "מוחק..."),
    deleteTreatmentConfirm: p(
      "Delete this treatment permanently? This action cannot be undone.",
      "למחוק את הטיפול לצמיתות? פעולה זו אינה ניתנת לביטול.",
    ),
    deleteSelectedTreatments: p("Delete selected", "מחיקת הנבחרים"),
    selectedTreatmentsCountLabel: p("selected", "נבחרו"),
    deleteOneSelectedTreatmentConfirm: p(
      "Delete 1 selected treatment permanently? This action cannot be undone.",
      "למחוק טיפול נבחר אחד לצמיתות? פעולה זו אינה ניתנת לביטול.",
    ),
    deleteSelectedTreatmentsConfirmTemplate: p(
      "Delete {count} selected treatments permanently? This action cannot be undone.",
      "למחוק {count} טיפולים נבחרים לצמיתות? פעולה זו אינה ניתנת לביטול.",
    ),
    cannotDeleteReceiptLinkedTreatment: p(
      "Treatments linked to receipts cannot be deleted. Unlink the receipt first.",
      "אי אפשר למחוק טיפולים שמשויכים לקבלות. נתקו קודם את הקבלה.",
    ),
    loadingMore: p("Loading more…", "טוען עוד…"),
    loadMore: p("Load more", "טען עוד"),
    noMoreRows: p("No more treatments.", "אין עוד טיפולים."),
    paymentFieldsHint: p(
      "If you choose bank transfer, pick the account that received the fee. If you choose digital payment, pick the saved method (e.g. Bit, Paybox) from your household list.",
      "אם בחרתם העברה בנקאית, בחרו את החשבון שאליו הופקד התשלום. אם בחרתם תשלום דיגיטלי, בחרו את האמצעי השמור (למשל ביט, פייבוקס) מרשימת האמצעים של הבית.",
    ),
    receiptCol: p("Receipt", "קבלה"),
    receiptLinkedHint: p(
      "Allocated on receipt(s) below. Edit allocations from the receipt page.",
      "שויך לקבלה/ות למטה. ניתן לערוך שיוך מעמוד הקבלה.",
    ),
    receiptNotLinkedHint: p("Not linked to any receipt.", "לא משויך לאף קבלה."),
    createReceiptForSelected: p("Create receipt for selected", "יצירת קבלה לנבחרים"),
    unlinkFromReceipt: p("Unlink", "נתק"),
    inlineReceiptNumber: p("Receipt number (optional)", "מספר קבלה (אופציונלי)"),
    inlineReceiptDate: p("Receipt payment date", "תאריך תשלום בקבלה"),
    treatmentTravelSection: p("Travel for this session", "נסיעה למפגש זה"),
    treatmentTravelCheckbox: p(
      "Record travel reimbursement linked to this treatment",
      "רישום החזר נסיעות משויך לטיפול זה",
    ),
    treatmentTravelAmount: p("Travel reimbursement amount", "סכום החזר נסיעות"),
    treatmentTravelKmOptional: p("Distance (km, optional)", "מרחק (ק״מ, אופציונלי)"),
    treatmentTravelCurrencyHint: p(
      "Uses the session currency above.",
      "משתמש במטבע של המפגש למעלה.",
    ),
    treatmentTravelAmountError: p(
      "Enter a valid travel reimbursement amount when travel is enabled.",
      "הזינו סכום החזר נסיעות תקף כאשר מסומנת נסיעה למפגש.",
    ),
    importBtn: p("Import treatments", "ייבוא טיפולים"),
    importClearPreview: p("Clear preview", "ניקוי תצוגה"),
    importBackToTreatments: p("Back to treatments", "חזרה לטיפולים"),
    importDownloadExample: p("Download example CSV (headers only)", "הורדת קובץ לדוגמה (כותרות בלבד)"),
    importTitle: p("Import treatments workbook", "ייבוא קובץ טיפולים"),
    importInstructions: p(
      "Upload a workbook, review the preview, then confirm to import. Treatment date cells can include time, or you can use a separate time column (e.g. שעה). Naive date-times are interpreted in Asia/Jerusalem.",
      "העלו קובץ, בדקו את התצוגה המקדימה, ואז אשרו לייבוא. תאי תאריך טיפול יכולים לכלול שעה, או להשתמש בעמודת שעה נפרדת (למשל שעה). תאריך-שעה ללא אזור זמן מפורש מפורש לפי Asia/Jerusalem.",
    ),
    importProfile: p("Import profile", "פרופיל ייבוא"),
    importProfilePrivate: p("Clinic (Tipulim)", "קליניקה (טיפולים)"),
    importProfileOrg: p("Organization monthly", "ארגון חודשי"),
    importAutoProgramHint: p(
      "No programs for this job; treatments will be imported without a program.",
      "אין תוכניות למשרה זו; הטיפולים ייובאו ללא תוכנית.",
    ),
    importChooseFile: p("Workbook file", "קובץ ייבוא"),
    importSheet: p("Sheet", "לשונית"),
    importMissingVisitType: p("If visit type is missing", "אם סוג ביקור חסר"),
    importNoFallback: p("Ask me during preview", "לבקש ממני בתצוגה מקדימה"),
    importVisitClinic: p("Clinic", "קליניקה"),
    importVisitHome: p("Home", "בית"),
    importVisitPhone: p("Phone", "טלפון"),
    importVisitVideo: p("Video", "וידאו"),
    importAnalyze: p("Analyze file", "ניתוח קובץ"),
    importConfirm: p("Confirm import", "אישור ייבוא"),
    importSummaryTitle: p("Import summary", "סיכום ייבוא"),
    importNewClients: p("New clients", "לקוחות חדשים"),
    importTreatments: p("Treatments", "טיפולים"),
    importReceipts: p("Receipts to generate", "קבלות ליצירה"),
    importProgramsToCreate: p("Programs to auto-create", "תוכניות שיווצרו אוטומטית"),
    importWarnings: p("Warnings", "אזהרות"),
    importErrors: p("Blocking errors", "שגיאות חוסמות"),
    importConflicts: p("Client conflicts", "התנגשויות לקוח"),
    importApplyNote: p("Import completed.", "הייבוא הושלם."),
    importErrUnlinkedReceiptWithRow: p(
      "Row {row}: Receipt row could not be linked to treatments. Add a matching treatment receipt number (or matching covered month) and analyze again.",
      "שורה {row}: שורת הקבלה לא קושרה לטיפולים. הוסיפו מספר קבלה תואם בשורות הטיפול (או חודש כיסוי תואם) ונתחו שוב.",
    ),
    importErrUnlinkedReceipt: p(
      "A receipt row could not be linked to treatments. Add a matching treatment receipt number (or matching covered month) and analyze again.",
      "שורת קבלה לא קושרה לטיפולים. הוסיפו מספר קבלה תואם בשורות הטיפול (או חודש כיסוי תואם) ונתחו שוב.",
    ),
    importErrAllocationMismatchWithRow: p(
      "Row {row}: Receipt total does not match linked treatment amounts.",
      "שורה {row}: סכום הקבלה לא תואם לסכום הטיפולים המקושרים.",
    ),
    importErrAllocationMismatch: p(
      "Receipt total does not match linked treatment amounts.",
      "סכום הקבלה לא תואם לסכום הטיפולים המקושרים.",
    ),
    importDebugTitle: p("Import debug", "דיבוג ייבוא"),
    importCreatedCountsTitle: p("Created", "נוצרו"),
    importCreatedClients: p("clients", "לקוחות"),
    importCreatedTreatments: p("treatments", "טיפולים"),
    importCreatedAppointments: p("appointments", "תורים"),
    importCreatedReceipts: p("receipts", "קבלות"),
    importCreatedAllocations: p("allocations", "שיוכים"),
    importCreatedConsultations: p("consultations", "ייעוצים"),
    importCreatedTravel: p("travel entries", "נסיעות"),
    importCreatedPrograms: p("programs", "תוכניות"),
    importDetailedMessagePrefix: p("Import completed successfully in", "הייבוא הושלם בהצלחה בתוך"),
    importDetailedMessageCreated: p("Created:", "נוצרו:"),
    importWorkingAnalyze: p("Analyzing file…", "מנתח קובץ…"),
    importWorkingCommit: p("Import in progress…", "הייבוא מתבצע…"),
    importWorkingElapsed: p("Elapsed", "זמן שחלף"),
    importWorkingProgress: p("Progress (estimate)", "התקדמות (הערכה)"),
    importWorkingLeaveWarning: p(
      "Import is still running. Leaving this page may interrupt your request.",
      "הייבוא עדיין רץ. מעבר עמוד עלול להפריע לבקשה.",
    ),
    importWorkingDoNotNavigate: p(
      "Please do not close the browser or navigate away until import completes.",
      "נא לא לסגור את הדפדפן או לעבור עמוד עד שהייבוא יסתיים.",
    ),
    importDebugUnlinkedReceipts: p("Unlinked receipts", "קבלות ללא שיוך"),
    importDebugOrgPaymentRows: p("Org payment diagnostics", "דיאגנוסטיקת תשלומי ארגון"),
    importDebugCommitLinkTitle: p("Commit link diagnostics", "דיאגנוסטיקת קישור בשמירה"),
    importDebugMissingAllocationLinks: p("Missing allocation links", "שיוכי הקצאה חסרים"),
    importDebugMissingMarkPaidLinks: p("Missing mark-paid links", "עדכוני סימון-שולם חסרים"),
    createCompletedAppointmentsLabel: p(
      "Also create completed appointments for imported treatments",
      "ליצור גם תורים שהושלמו עבור הטיפולים המיובאים",
    ),
  };
}

export function privateClinicTreatmentAttachments(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    heading: p("Attachments", "קבצים מצורפים"),
    uploadFile: p("Upload file", "העלאת קובץ"),
    uploading: p("Uploading…", "מעלה…"),
    download: p("Download", "הורדה"),
    open: p("Open", "פתיחה"),
    remove: p("Remove", "הסרה"),
    transcribeEn: p("Transcribe (English)", "תמלול (אנגלית)"),
    transcribeHe: p("Transcribe (Hebrew)", "תמלול (עברית)"),
    transcribing: p("Transcribing…", "מתמלל…"),
    transcript: p("Transcript", "תמליל"),
    privacyNotice: p(
      "Transcription sends audio to a third-party service. Review the text before using it in clinical notes.",
      "תמלול שולח את האודיו לשירות חיצוני. יש לעבור על הטקסט לפני שימוש בערות קליניות.",
    ),
    statusPending: p("Transcription in progress…", "תמלול בתהליך…"),
    statusFailed: p("Transcription failed", "התמלול נכשל"),
    copyTranscript: p("Copy transcript", "העתקת תמליל"),
    copied: p("Copied.", "הועתק."),
    noAttachments: p("No attachments yet.", "אין עדיין קבצים מצורפים."),
    uploadConstraintsHint: p(
      "Max file size: 25 MB. Common formats: PDF, images, audio, and documents.",
      "גודל קובץ מקסימלי: 25MB. פורמטים נפוצים: PDF, תמונות, אודיו ומסמכים.",
    ),
    uploadFailed: p("Upload failed", "ההעלאה נכשלה"),
    transcribeFailed: p("Transcription failed", "התמלול נכשל"),
    hebrewAwsFallbackHint: p(
      "Hebrew is set to AWS, but your storage is not native AWS S3; using fallback transcription provider.",
      "עברית מוגדרת ל-AWS, אבל האחסון אינו AWS S3 מקורי; נעשה שימוש בספק תמלול חלופי.",
    ),
  };
}

export function privateClinicReceipts(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    newReceipt: p("New receipt", "קבלה חדשה"),
    editReceipt: p("Edit receipt", "עריכת קבלה"),
    saveReceipt: p("Save receipt", "שמירת קבלה"),
    receiptNumber: p("Receipt #", "מס׳ קבלה"),
    submittedDate: p("Submitted date", "תאריך הגשה"),
    totalAmount: p("Total amount", "סכום כולל"),
    grossAmount: p("Gross amount", "סכום ברוטו"),
    grossAmountHint: p(
      "Usually same as net; for employees, the amount on the salary receipt before deductions.",
      "לרוב זהה לנטו; לשכירים — הסכום על קבלת השכר לפני ניכויים.",
    ),
    netAmount: p("Net amount (bank deposit)", "סכום נטו (הפקדה לבנק)"),
    netAmountHint: p(
      "Gross should match allocated treatments/consultations/travel. Net should match the actual bank transaction.",
      "ברוטו אמור להתאים להקצאות טיפולים/ייעוצים/נסיעות. נטו אמור להתאים לתנועת הבנק בפועל.",
    ),
    receiptKind: p("Receipt kind", "סוג קבלה"),
    receiptKindRegular: p("Regular receipt", "קבלה רגילה"),
    receiptKindSalaryFictitious: p("Salary (fictitious)", "שכר (קבלה פיקטיבית)"),
    grossAmountSummary: p("Gross (allocations basis)", "ברוטו (בסיס להקצאות)"),
    netAmountSummary: p("Net (bank matching)", "נטו (התאמת בנק)"),
    recipientClient: p("Client", "לקוח"),
    recipientOrg: p("Organization", "ארגון"),
    paymentCash: p("Cash", "מזומן"),
    paymentBank: p("Bank transfer", "העברה בנקאית"),
    paymentDigital: p("Digital card", "כרטיס דיגיטלי"),
    paymentCredit: p("Credit card", "כרטיס אשראי"),
    paymentDate: p("Payment date", "תאריך תשלום"),
    paymentDateHint: p(
      "Optional. Saving sets this date on all treatments linked to this receipt; clearing it clears their payment dates.",
      "אופציונלי. שמירה מעדכנת את התאריך בכל הטיפולים המשויכים לקבלה; ניקוי השדה מנקה את תאריכי התשלום שלהם.",
    ),
    linkTxPayment: p(
      "Link bank transaction — payment received",
      "קישור לתנועת בנק — תשלום שהתקבל",
    ),
    linkTxPaymentHint: p(
      "Optional: match an imported bank credit (incoming payment) to this receipt.",
      "אופציונלי: התאמת זיכוי בנק מיובא (תשלום נכנס) לקבלה זו.",
    ),
    createAllocate: p("Create & allocate", "יצירה ושיוך"),
    morningConnectedBadge: p("Morning — receipt # issued automatically", "Morning — מס׳ קבלה יונפק אוטומטית"),
    morningReceiptNumberHint: p(
      "Receipt number will be assigned by Morning when you save.",
      "מספר הקבלה יוקצה על ידי Morning בעת השמירה.",
    ),
    receiptNumberingChoiceLabel: p("Receipt number", "מספר קבלה"),
    receiptNumberingMorning: p("Issue via Morning (auto number)", "הפקה ב-Morning (מספר אוטומטי)"),
    receiptNumberingManual: p("Enter receipt # manually", "הזנת מספר קבלה ידנית"),
    receiptNumberingManualHint: p(
      "Use your physical receipt book or an existing number. Morning will not issue this receipt.",
      "השתמשו בפנקס הקבלות או במספר קיים. Morning לא יפיק קבלה זו.",
    ),
    duplicateReceiptNumberError: p(
      "That receipt number is already used for this calendar year. Choose a different number.",
      "מספר קבלה זה כבר בשימוש בשנה הקלנדרית. בחרו מספר אחר.",
    ),
    morningClientOnlyError: p(
      "Morning receipts require a client recipient.",
      "הפקה ב-Morning דורשת לקוח כנמען.",
    ),
    downloadDocument: p("Download receipt PDF", "הורדת PDF קבלה"),
    retryMorningIssue: p("Retry Morning issue", "ניסיון חוזר להפקה ב-Morning"),
    morningIssueFailed: p("Morning issue failed", "הפקת הקבלה ב-Morning נכשלה"),
    morningIssued: p("Issued via Morning", "הופק ב-Morning"),
    linkTreatmentsHeading: p("Link treatments to this receipt", "שיוך טיפולים לקבלה זו"),
    linkTreatmentsSubmit: p("Link selected treatments", "שיוך טיפולים נבחרים"),
    linkConsultationsHeading: p("Link consultations to this receipt", "שיוך ייעוצים לקבלה זו"),
    linkConsultationsSubmit: p("Link selected consultations", "שיוך ייעוצים נבחרים"),
    linkTravelHeading: p("Link travel entries to this receipt", "שיוך נסיעות לקבלה זו"),
    linkTravelSubmit: p("Link selected travel entries", "שיוך נסיעות נבחרות"),
    unlinkFromReceipt: p("Unlink", "נתק"),
    selectAll: p("Select all", "בחירת הכל"),
    deselectAll: p("Deselect all", "ניקוי בחירה"),
    selectSuggested: p("Select suggested (period)", "בחירת מוצעים (תקופה)"),
    suggestedCombinedTotal: p("Suggested total for selected period", "סכום מוצע לתקופה שנבחרה"),
    suggestedTotalsBreakdown: (treatments: string, consultations: string, travel: string) =>
      p(
        `Breakdown — T: ${treatments}, C: ${consultations}, TR: ${travel}.`,
        `פירוט — T: ${treatments}, C: ${consultations}, TR: ${travel}.`,
      ),
    suggestedMatchesGross: p(
      "Suggested total matches receipt gross.",
      "הסכום המוצע תואם לסכום הברוטו בקבלה.",
    ),
    suggestedDiffFromGross: (diff: string, currency: string) =>
      p(
        `Suggested total differs from gross by ${diff} ${currency}.`,
        `הסכום המוצע שונה מהברוטו ב-${diff} ${currency}.`,
      ),
    periodPreviewTitle: p("Period breakdown preview", "תצוגה מקדימה של פירוט התקופה"),
    periodPreviewIdle: p(
      "Select a job and covered period to preview unlinked treatments, consultations, and travel.",
      "בחרו משרה ותקופה מכוסה כדי להציג תצוגה מקדימה של טיפולים, ייעוצים ונסיעות לא מקושרים.",
    ),
    periodPreviewLoading: p("Loading preview…", "טוען תצוגה מקדימה…"),
    periodPreviewError: p("Could not load period preview.", "לא ניתן לטעון את תצוגת התקופה."),
    periodPreviewEmpty: p(
      "No unlinked treatments, consultations, or travel were found in the selected period.",
      "לא נמצאו טיפולים, ייעוצים או נסיעות לא מקושרים בתקופה שנבחרה.",
    ),
    periodPreviewEmptyFiltered: p(
      "No entries match the selected filters.",
      "אין רשומות שתואמות לסינון שנבחר.",
    ),
    periodPreviewType: p("Type", "סוג"),
    periodPreviewDate: p("Date", "תאריך"),
    periodPreviewClient: p("Client", "לקוח"),
    periodPreviewAmount: p("Amount", "סכום"),
    periodPreviewTreatmentType: p("Treatment", "טיפול"),
    periodPreviewConsultationType: p("Consultation", "ייעוץ"),
    periodPreviewTravelType: p("Travel", "נסיעה"),
    periodPreviewSubtotalTreatments: p("Subtotal — Treatments", "סכום ביניים — טיפולים"),
    periodPreviewSubtotalConsultations: p("Subtotal — Consultations", "סכום ביניים — ייעוצים"),
    periodPreviewSubtotalTravel: p("Subtotal — Travel", "סכום ביניים — נסיעות"),
    periodPreviewTruncated: p(
      "Showing up to 200 rows per category.",
      "מוצגות עד 200 שורות לכל קטגוריה.",
    ),
    periodPreviewBreakdownTemplate: p(
      "Breakdown — T: {treatments}, C: {consultations}, TR: {travel}.",
      "פירוט — T: {treatments}, C: {consultations}, TR: {travel}.",
    ),
    periodPreviewDiffFromGrossTemplate: p(
      "Suggested total differs from gross by {diff} {currency}.",
      "הסכום המוצע שונה מהברוטו ב-{diff} {currency}.",
    ),
    autoLinkPromptTitle: p(
      "After creating, auto-link entries if selected-period totals match gross",
      "לאחר יצירה, לשייך אוטומטית רשומות אם סכומי התקופה שנבחרה תואמים לברוטו",
    ),
    autoLinkPromptHint: p(
      "This checks unlinked treatments, consultations, and travel in the selected covered period for the same job.",
      "הבדיקה כוללת טיפולים, ייעוצים ונסיעות לא מקושרים בתקופת הכיסוי שנבחרה ולאותה משרה.",
    ),
    autoLinkCreatedSuccess: p(
      "Receipt created and suggested entries were linked automatically (totals matched gross).",
      "הקבלה נוצרה והשורות המוצעות שויכו אוטומטית (הסכומים תאמו לברוטו).",
    ),
    autoLinkCreatedSkipped: p(
      "Receipt created. Suggested entries were not auto-linked because totals did not match gross (or period is missing).",
      "הקבלה נוצרה. לא בוצע שיוך אוטומטי כי הסכומים לא תאמו לברוטו (או שחסרה תקופה).",
    ),
    autoLinkAllocatedTotal: p(
      "Auto-linked total (currently allocated)",
      "סכום שיוך אוטומטי (מוקצה כעת)",
    ),
    autoLinkAllocatedMatchesGross: p(
      "Allocated total matches receipt gross.",
      "הסכום המוקצה תואם לברוטו בקבלה.",
    ),
    coveredStart: p("Covered period start", "תחילת תקופה מכוסה"),
    coveredEnd: p("Covered period end", "סוף תקופה מכוסה"),
    receivablesLastMonth: p("Organization receivables (last month)", "חובות ארגונים (חודש קודם)"),
    receivablesRangeLabel: p("Coverage month", "חודש כיסוי"),
    earnedAmount: p("Earned", "נצבר"),
    paidAmount: p("Paid", "שולם"),
    outstandingAmount: p("Outstanding", "יתרה"),
    receiptsHeading: p("Receipts", "קבלות"),
    filters: p("Filters", "סינון"),
    filterRecipient: p("Recipient", "נמען"),
    selectRecipient: p("Select recipient", "בחרו נמען"),
    selectPaymentMethod: p("Select payment method", "בחרו אמצעי תשלום"),
    programOptionalEmpty: p("Program (optional)", "תכנית (אופציונלי)"),
    selectClient: p("Select client", "בחרו לקוח"),
    filterBankLink: p("Bank transaction", "תנועת בנק"),
    paymentMethodLabel: p("Payment method", "אמצעי תשלום"),
    bankLinkAll: p("All", "הכל"),
    bankLinkLinked: p("Linked", "מקושר"),
    bankLinkUnlinked: p("Not linked", "לא מקושר"),
    receiptsCount: (n: number) => p(`Receipts (${n})`, `קבלות (${n})`),
    sortBy: p("Sort by", "מיון לפי"),
    sortDir: p("Direction", "כיוון"),
    sortAsc: p("Ascending", "עולה"),
    sortDesc: p("Descending", "יורד"),
    tableNumber: p("#", "מס׳"),
    tableDate: c.date,
    tableJob: c.job,
    tableAmount: c.amount,
    tableTreatmentsCount: p("# Treatments", "מס׳ טיפולים"),
    tableView: p("View", "צפייה"),
    loadingMore: p("Loading more…", "טוען עוד…"),
    loadMore: p("Load more", "טען עוד"),
    noMoreRows: p("No more receipts.", "אין עוד קבלות."),
    formError: p("Could not save receipt. Please review the fields and try again.", "לא ניתן לשמור קבלה. בדקו את השדות ונסו שוב."),
    open: p("Open", "פתיחה"),
    importBtn: p("Import receipts", "ייבוא קבלות"),
    importBackToReceipts: p("Back to receipts", "חזרה לקבלות"),
    importTitleReceipts: p("Import receipts", "ייבוא קבלות"),
    importInstructionsReceipts: p(
      "Upload a spreadsheet with: Payment Date, Client, Amount, Receipt #, Notes, Payment method. Optional columns treatmentDate01, treatmentDate02, … set each session’s treatment date, and treatmentTime01, treatmentTime02, … set each session’s time (or use a single Time column for all dates on that row). Date cells may include time directly. Naive date-times are interpreted in Asia/Jerusalem. If several treatment dates are filled on one row, the amount is split evenly across those sessions; each share is compared to usual fee ×110% — shares within that cap set treatment amounts and receipt allocations; otherwise treatments are created with session fee unset (blank) and the receipt is left unallocated to them until you edit manually.",
      "העלו גיליון עם: תאריך תשלום, לקוח, סכום, מספר קבלה, הערות, אמצעי תשלום. עמודות אופציונליות treatmentDate01, treatmentDate02, … מגדירות את תאריך כל טיפול, ועמודות treatmentTime01, treatmentTime02, … מגדירות את השעה לכל טיפול (או עמודת Time אחת לכל התאריכים באותה שורה). תאי תאריך יכולים לכלול שעה ישירות. תאריך-שעה ללא אזור זמן מפורש מפורש לפי Asia/Jerusalem. אם ממלאים כמה תאריכי טיפול באותה שורה, הסכום מתחלק שווה בין המפגשים; כל חלק מושווה לעלות המפגש המקובלת ×110% — חלקים בטווח מגדירים סכומי טיפול וחלוקת קבלה; אחרת נוצרים טיפולים ללא סכום מפגש (ריק) והקבלה נשארת ללא הקצאה אליהם עד עריכה ידנית.",
    ),
    usualTreatmentCostLabel: p("Usual treatment cost (per session)", "עלות טיפול מקובלת (למפגש)"),
    usualTreatmentCostHint: p(
      "Compared to each receipt amount: auto-create one treatment when amount ≤ this × 110%. With several treatment dates on one row, each equal split share is compared the same way.",
      "מושווה לסכום כל קבלה: ייווצר טיפול אוטומטית כאשר הסכום ≤ ערך זה × 110%. כשיש כמה תאריכי טיפול בשורה, כל חלק מהחלוקה השווה נבדק באותה צורה.",
    ),
    saveUsualTreatmentCostDefault: p("Save as household default for next time", "שמירה כברירת מחדל לבית"),
    importCreatedAppointments: p("appointments", "תורים"),
    createCompletedAppointmentsLabel: p(
      "Also create completed appointments for imported treatments",
      "ליצור גם תורים שהושלמו עבור הטיפולים המיובאים",
    ),
    importReceiptsNeedingManualTreatment: p(
      "Receipts without auto-treatment (add treatments manually)",
      "קבלות ללא טיפול אוטומטי (הוסיפו טיפולים ידנית)",
    ),
  };
}

export function privateClinicExpenses(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    addExpense: p("Add expense", "הוספת הוצאה"),
    expensesHeading: p("Expenses", "הוצאות"),
    linkTxExpense: p("Link bank transaction — clinic expense", "קישור לתנועת בנק — הוצאת קליניקה"),
    linkTxExpenseHint: p(
      "Optional: link a debit or outgoing payment for this expense.",
      "אופציונלי: קישור לחיוב או תשלום יוצא עבור הוצאה זו.",
    ),
    clinicExpenseOptional: p("Clinic expense (optional)", "הוצאת קליניקה (אופציונלי)"),
  };
}

export function privateClinicConsultations(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    dateTime: c.dateTime,
    intro: p(
      "Log meetings and consultations with one payable amount, type, and job. Link receipts and (optionally) a bank transaction for paid status tracking.",
      "רישום פגישות וייעוצים עם סכום לתשלום, סוג ומשרה. קישור לקבלות ולתנועת בנק (אופציונלי) למעקב מצב תשלום.",
    ),
    addTitle: p("Add consultation / meeting", "הוספת ייעוץ / פגישה"),
    amountLabel: p("Amount to be paid", "סכום לתשלום"),
    linkTx: p("Linked bank transaction", "תנועת בנק מקושרת"),
    recent: p("Recent", "אחרונים"),
    filters: p("Filters", "סינון"),
    filterReceivedPayment: p("Linked to receipt", "מקושר לקבלה"),
    receivedAll: p("All", "הכל"),
    receivedLinked: p("Yes", "כן"),
    receivedUnlinked: p("No", "לא"),
    consultationsHeading: p("Consultations", "ייעוצים"),
    consultationsCount: (n: number) => p(`Consultations (${n})`, `ייעוצים (${n})`),
    loadingMore: p("Loading more…", "טוען עוד…"),
    loadMore: p("Load more", "טען עוד"),
    noMoreRows: p("No more consultations.", "אין ייעוצים נוספים."),
    receipt: p("Receipt", "קבלה"),
    transaction: p("Transaction", "תנועה"),
    clients: p("Clients", "לקוחות"),
    selectClientPlaceholder: p("Select client…", "בחירת לקוח…"),
    addAdditionalClient: p("Add another client", "הוספת לקוח נוסף"),
  };
}

export function privateClinicTravel(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    intro: p(
      "Record travel with a payable amount, link it to a job and optionally to a specific treatment or consultation, and attach receipt/transaction links for payment tracking.",
      "רישום נסיעות עם סכום לתשלום, שיוך למשרה ואופציונלית למפגש טיפול או ייעוץ, וקישור לקבלה/תנועה למעקב תשלום.",
    ),
    addTravel: p("Add travel", "הוספת נסיעה"),
    formLinkingInstructions: p(
      "Choose the job first. You can link this travel to one treatment or one consultation for that job, or leave both empty to record travel for the job only (for example, travel to an event that is not logged as a session).",
      "בחרו תחילה את המשרה. אפשר לקשר את הנסיעה למפגש טיפול אחד או לייעוץ אחד באותה משרה, או להשאיר את שניהם ריקים כדי לרשום נסיעה כללית למשרה (למשל נסיעה לאירוע שלא נרשם כמפגש).",
    ),
    fieldJob: p("Job", "משרה"),
    fieldTreatmentOptional: p("Treatment (optional)", "טיפול (אופציונלי)"),
    fieldConsultationOptional: p("Consultation (optional)", "ייעוץ (אופציונלי)"),
    fieldOccurredAt: p("Date and time", "תאריך ושעה"),
    jobSelectPlaceholder: p("Select a job…", "בחרו משרה…"),
    treatmentSelectPlaceholder: p("None — job-level travel", "ללא — נסיעה ברמת המשרה"),
    consultationSelectPlaceholder: p("None — job-level travel", "ללא — נסיעה ברמת המשרה"),
    fieldAmount: p("Amount", "סכום"),
    amountPlaceholder: p("Required", "חובה"),
    fieldCurrency: p("Currency", "מטבע"),
    fieldKmOptional: p("Distance (km, optional)", "מרחק (ק״מ, אופציונלי)"),
    kmPlaceholder: p("e.g. 12.5", "למשל 12.5"),
    fieldNotes: p("Notes", "הערות"),
    notesPlaceholder: p("Route, parking, tolls…", "מסלול, חניה, כביש אגרה…"),
    linkTravelTx: p(
      "Link transaction — travel cost / reimbursement",
      "קישור לתנועה — עלות נסיעה / החזר",
    ),
    linkTravelHint: p(
      "Usually a debit or a transfer that paid for this travel.",
      "בדרך כלל חיוב או העברה ששילמה על הנסיעה.",
    ),
    entries: p("Entries", "רשומות"),
    filters: p("Filters", "סינון"),
    filterBankLink: p("Linked to receipt", "מקושר לקבלה"),
    receivedAll: p("All", "הכל"),
    receivedLinked: p("Yes", "כן"),
    receivedUnlinked: p("No", "לא"),
    entriesCount: (n: number) => p(`Entries (${n})`, `רשומות (${n})`),
    travelReports: p("Travel Reports", "דוחות נסיעות"),
    scope: p("Scope", "שיוך"),
    scopeTreatment: p("Treatment:", "טיפול:"),
    scopeConsultation: p("Consultation:", "ייעוץ:"),
    scopeJob: p("Job", "משרה"),
    receipt: p("Receipt", "קבלה"),
    linkedTx: p("Linked transaction", "תנועה מקושרת"),
  };
}

export function privateClinicAppointments(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    oneOff: p("One-off appointment", "תור חד פעמי"),
    recurringSeries: p("Recurring series", "סדרה חוזרת"),
    recurringRules: p("Recurring rules", "כללים חוזרים"),
    noneShort: p("None.", "אין."),
    pageTitle: p("Appointments", "תורים"),
    upcoming: p("Upcoming appointments", "תורים קרובים"),
    pastScheduled: p("Past scheduled appointments", "ביקורים מתוזמנים שעבר זמנם"),
    noUpcoming: p("No upcoming appointments.", "אין תורים קרובים."),
    noAppointments: p("No appointments match this filter.", "אין תורים התואמים למסנן."),
    filterStatusLabel: p("Status", "סטטוס"),
    filterStatusScheduled: p("Scheduled only", "מתוזמנים בלבד"),
    filterStatusAll: p("All statuses", "כל הסטטוסים"),
    filterStatusCompleted: p("Completed only", "הושלמו בלבד"),
    filterStatusCancelled: p("Cancelled only", "בוטלו בלבד"),
    statusCol: p("Status", "סטטוס"),
    overdue: p("Overdue", "באיחור"),
    programOptional: p("Program (optional)", "תכנית (אופציונלי)"),
    schedule: p("Schedule", "תזמון"),
    weekly: p("Weekly", "שבועי"),
    biweekly: p("Every 2 weeks", "כל שבועיים"),
    createSeriesGenerate: p("Create series & generate", "יצירת סדרה והפקת תורים"),
    startCol: p("Start", "התחלה"),
    deleteSeries: p("Delete series", "מחיקת סדרה"),
    statusScheduled: p("Scheduled", "מתוזמן"),
    statusCancelled: p("Cancelled", "בוטל"),
    statusCompleted: p("Completed", "הושלם"),
    setStatus: p("Set", "החל"),
    addAppointment: p("Add appointment", "הוספת תור"),
    recurringToggle: p("Recurring appointment", "תור חוזר"),
    actionsCol: p("Actions", "פעולות"),
    cancel: p("Cancel", "ביטול"),
    reschedule: p("Reschedule", "עריכה"),
    edit: p("Edit", "עריכה"),
    logTreatment: p("Log treatment", "דיווח טיפול"),
    reportTreatmentTitle: p("Report treatment from appointment", "דיווח טיפול מתוך תור"),
    reportTreatmentSubmit: p("Report treatment", "דווח טיפול"),
    reportTreatmentAlreadyLinked: p(
      "A treatment is already linked to this appointment.",
      "כבר מקושר טיפול לתור הזה.",
    ),
    reportTreatmentSaved: p(
      "Treatment reported and appointment marked complete.",
      "הטיפול דווח והתור סומן כהושלם.",
    ),
    reportTreatmentBlocked: p(
      "This appointment already has a linked treatment, so duplicate reporting is blocked.",
      "לתור הזה כבר מקושר טיפול, לכן נחסם דיווח כפול.",
    ),
    reportTreatmentHint: p(
      "Use this form when the treatment should complete and link this appointment.",
      "השתמשו בטופס הזה כאשר הטיפול צריך להשלים ולקשר את התור הזה.",
    ),
    scheduleNextAppointment: p("Schedule next appointment", "קביעת תור הבא"),
    scheduleNextAppointmentHint: p(
      "No other future appointment is scheduled for this client.",
      "לא קבוע תור עתידי נוסף ללקוח זה.",
    ),
    cancelScopeThisOnly: p("This occurrence only", "מופע זה בלבד"),
    cancelScopeThisAndFuture: p("This and all future occurrences", "מופע זה וכל העתידיים"),
    editRecurrence: p("Edit recurrence", "עריכת חזרתיות"),
    editRecurrenceTitle: p("Edit recurrence from this date", "עריכת חזרתיות מתאריך זה"),
    googleSeriesSyncError: p("Google Calendar sync error", "שגיאת סנכרון Google Calendar"),
    remove: p("Remove", "הסרה"),
    additionalClients: p("Additional clients", "לקוחות נוספים"),
    addAdditionalClient: p("Add additional client", "הוספת לקוח נוסף"),
    viewLinkedTreatment: p("View linked treatment", "צפייה בטיפול מקושר"),
    cancelTitle: p("Cancel appointment", "ביטול תור"),
    cancelConfirm: p(
      "Mark this appointment as cancelled?",
      "לסמן את התור כמבוטל?",
    ),
    backToAppointments: p("Back to appointments", "חזרה לתורים"),
    backToUpcomingVisits: p("Back to upcoming visits", "חזרה לביקורים קרובים"),
    newTitle: p("New appointment", "תור חדש"),
    editTitle: p("Edit appointment", "עריכת תור"),
    rescheduleTitle: p("Reschedule", "דחיית תור"),
    save: p("Save", "שמירה"),
    partOfSeries: p("Part of a recurring series", "חלק מסדרה חוזרת"),
    endRecurring: p("End recurring (remove future visits)", "סיום חזרתיות (מחיקת עתידיים)"),
    endRecurringConfirm: p(
      "This removes all future scheduled visits in this series and stops new ones from being generated.",
      "פעולה זו תמחק את כל התורים העתידיים המתוזמנים בסדרה ותעצור יצירת תורים חדשים.",
    ),
    deleteEntireSeries: p("Delete entire series", "מחיקת כל הסדרה"),
    deleteEntireSeriesConfirm: p(
      "Delete this recurring series and every appointment linked to it? This cannot be undone.",
      "למחוק את הסדרה החוזרת ואת כל התורים הקשורים אליה? לא ניתן לבטל.",
    ),
    visitTypeCol: p("Visit type", "סוג ביקור"),
    dayOfWeek: p("Day of week", "יום בשבוע"),
    startDateTime: p("Start date & time", "תאריך ושעת התחלה"),
    startDate: p("Start date", "תאריך התחלה"),
    startTime: p("Start time", "שעת התחלה"),
    endDateTime: p("End date & time", "תאריך ושעת סיום"),
    durationMinutes: p("Duration (minutes)", "משך (דקות)"),
    durationMinutesOptional: p("Duration (minutes, optional)", "משך (דקות, אופציונלי)"),
    timeOfDay: p("Time of day", "שעת התחלה"),
    seriesStartDate: p("Series start date", "תאריך התחלת סדרה"),
    seriesEndDateOptional: p("Series end date (optional)", "תאריך סיום סדרה (אופציונלי)"),
    endOptional: p("End (optional)", "סיום (אופציונלי)"),
    reason: p("Reason", "סיבה"),
    other: p("Other", "אחר"),
    notes: p("Notes", "הערות"),
    notesRequiredForOther: p("Notes are required when Other is selected.", "חובה למלא הערות כשנבחר \"אחר\"."),
    therapistCancelled: p("Therapist cancelled", "המטפל ביטל"),
    patientCancelled: p("Patient cancelled", "המטופל ביטל"),
    therapistRescheduled: p("Therapist rescheduled", "המטפל דחה"),
    patientRescheduled: p("Patient rescheduled", "המטופל דחה"),
  };
}

export function privateClinicReports(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    title: p("Reports", "דוחות"),
    intro: p(
      "Compliance and clinic reports. Download extracts for your records.",
      "דוחות עמידה ורישום קליניקה. הורידו קבצים לתיעוד.",
    ),
    therapistDiaryTitle: p("Therapist diary (יומן מטפל)", "יומן מטפל"),
    therapistDiaryDesc: p(
      "All create, update, reschedule, cancel, and delete actions on appointments (audit trail).",
      "כל פעולות היצירה, העדכון, דחייה, ביטול ומחיקה על תורים (יומן ביקורת).",
    ),
    download: p("Download", "Download"),
    empty: p("No audit entries yet.", "אין רשומות ביקורת עדיין."),
    tableWhen: p("When", "מתי"),
    tableUser: p("User", "משתמש"),
    tableAction: p("Action", "פעולה"),
    tableAppointment: p("Appointment", "תור"),
    tableClient: p("Client", "לקוח"),
    tableDetails: p("Details", "פרטים"),
    monthPayableTitle: p("Month payable (external job)", "תשלום חודשי (מעסיק חיצוני)"),
    monthPayableDesc: p(
      "One Excel sheet for one job and calendar month: all payable lines (treatments, consultations, travel) in date order. Turn on filters from the Data tab (or use the header drop-downs) to narrow by line type, program, consultation type, client, and more. Totals by currency appear below the activity rows.",
      "גיליון Excel אחד לעבודה אחת ולחודש קלנדרי: כל שורות התשלום (טיפולים, ייעוצים, נסיעות) לפי תאריך. הפעילו מסננים בכרטיסיית נתונים (או מהכותרות) כדי לצמצם לפי סוג שורה, תוכנית, סוג ייעוץ, לקוח ועוד. סיכומים לפי מטבע מופיעים מתחת לשורות הפעילות.",
    ),
    monthPayableJob: p("Job", "עבודה"),
    monthPayableMonth: p("Month", "חודש"),
    monthPayableYear: p("Year", "שנה"),
    monthPayableNoJobs: p(
      "No private-clinic jobs are available for your account.",
      "אין עבודות קליניקה זמינות לחשבון שלך.",
    ),
    therapistDiaryYearFrom: p("From year", "משנה"),
    therapistDiaryYearTo: p("To year", "עד שנה"),
  };
}

export function privateClinicPetrol(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    title: p("Petrol fill-up", "תדלוק"),
    subtitle: p(
      "Choose the car, then enter the pump readout. Delta km and km/L use the previous fill with a lower odometer.",
      "בחרו רכב והזינו את נתוני העמדה. הפרש ק״מ וק״מ/ליטר מבוססים על התדלוק הקודם עם מדד נמוך יותר.",
    ),
    vehicles: p("Vehicles", "רכבים"),
    vehiclesHelp: p(
      "Add or rename vehicles here for petrol tracking only — no insurance, services, or other car records.",
      "הוסיפו או שינו שם רכבים כאן לצורך תדלוק בלבד — ללא ביטוח, טיפולים או רשומות רכב אחרות.",
    ),
    vehicleAdded: p("Vehicle added.", "הרכב נוסף."),
    vehicleUpdated: p("Vehicle updated.", "הרכב עודכן."),
    vehicleRemoved: p("Vehicle removed from this list.", "הרכב הוסר מהרשימה."),
    displayNameOptional: p("Display name (optional)", "שם תצוגה (אופציונלי)"),
    maker: p("Maker", "יצרן"),
    model: p("Model", "דגם"),
    plateOptional: p("Plate (optional)", "לוחית (אופציונלי)"),
    phWorkCar: p("e.g. Work car", "למשל רכב עבודה"),
    phToyota: p("e.g. Toyota", "למשל טויוטה"),
    phCorolla: p("e.g. Corolla", "למשל קורולה"),
    licensePlate: p("License plate", "מספר רישוי"),
    addVehicle: p("Add vehicle", "הוספת רכב"),
    backToPetrol: p("Back to petrol", "חזרה לתדלוק"),
    noVehicles: p("No vehicles yet — add a vehicle to log fill-ups.", "אין רכבים — הוסיפו רכב כדי לרשום תדלוקים."),
    saveVehicle: p("Save vehicle", "שמירת רכב"),
    edit: c.edit,
    remove: p("Remove", "הסרה"),
    removeConfirm: p(
      "Remove this vehicle from the petrol list? It will be hidden here; existing fill-ups stay in the database.",
      "להסיר את הרכב מרשימת התדלוק? הוא יוסתר כאן; תדלוקים קיימים נשמרים במסד הנתונים.",
    ),
    newFillUp: p("New fill-up", "תדלוק חדש"),
    editFillUp: p("Edit fill-up", "עריכת תדלוק"),
    linkTxOptional: p("Linked transaction (optional)", "תנועת בנק מקושרת (אופציונלי)"),
    linkTxHint: p(
      "One bank transaction can link to only one petrol record.",
      "תנועת בנק אחת יכולה להיות מקושרת לרשומת תדלוק אחת בלבד.",
    ),
    notesOptional: p("Notes (optional)", "הערות (אופציונלי)"),
    saveFillUp: p("Save fill-up", "שמירת תדלוק"),
    saveChanges: p("Save changes", "שמירת שינויים"),
    tableDate: c.date,
    paid: p("Paid", "שולם"),
    litres: p("L", "ל׳"),
    odo: p("Odo (km)", "מדד (ק״מ)"),
    deltaKm: p("Delta km", "הפרש ק״מ"),
    costPerL: p("Cost/L", "מחיר/ל׳"),
    kmPerL: p("km/L", "ק״מ/ל׳"),
    tx: p("Tx", "בנק"),
    vehiclePickerLabel: p("Vehicle", "רכב"),
    selectVehiclePlaceholder: p("Select a vehicle…", "בחרו רכב…"),
    noFillUpsForVehicle: p("No fill-ups for this vehicle yet.", "אין תדלוקים לרכב זה עדיין."),
    amountPaid: p("Amount paid", "סכום ששולם"),
    costPerLitrePreview: p("Cost per litre (from amount ÷ litres)", "מחיר לליטר (מסכום ÷ ליטרים)"),
    odometerKm: p("Odometer (km)", "מדד (ק״מ)"),
    selectEllipsis: p("Select…", "בחרו…"),
    tankerAgeHint: p(
      "People aged 16 or older on the fill date (requires date of birth). Change the date above to update who appears here.",
      "אנשים בני 16 ומעלה בתאריך התדלוק (נדרש תאריך לידה). שינוי התאריך למעלה מעדכן את הרשימה.",
    ),
    tankerNoEligible: p(
      "No one is aged 16+ on this fill date. Pick a different date or add/update dates of birth.",
      "אין מועמד בן 16 ומעלה בתאריך זה. בחרו תאריך אחר או עדכנו תאריכי לידה.",
    ),
    tankerNoDob: p(
      "Add a date of birth for each person who should appear here. You need at least one person aged 16+ on the fill date to record who tanked up.",
      "הוסיפו תאריך לידה לכל אדם שאמור להופיע. נדרש לפחות אדם אחד בן 16+ בתאריך התדלוק.",
    ),
    importFillUps: p("Import fill-ups", "ייבוא תדלוקים"),
    importTitle: p("Import petrol fill-ups", "ייבוא תדלוקים"),
    importIntro: p(
      "Upload a CSV or Excel file (.xlsx). The first row must be headers. Required columns: date (or filled_at), amount_paid (or amount), litres, odometer_km (or odometer). Optional: notes. Dates may be yyyy-mm-dd or match your household date format.",
      "העלו קובץ CSV או Excel ‎(.xlsx). בשורה הראשונה כותרות. עמודות נדרשות: תאריך (או filled_at), amount_paid (או amount), litres, odometer_km (או odometer). אופציונלי: notes. תאריכים ב־yyyy-mm-dd או לפי פורמט התאריך של הבית.",
    ),
    importFileLabel: p("Spreadsheet file", "קובץ גיליון"),
    importSubmit: p("Import", "ייבוא"),
    importBack: p("Back to petrol", "חזרה לתדלוק"),
    importNeedCar: p("Select a vehicle on the petrol page first.", "בחרו רכב בעמוד התדלוק תחילה."),
    importedOne: p("Imported 1 fill-up.", "יובא תדלוק אחד."),
    importedMany: (n: number) =>
      p(`Imported ${n} fill-ups.`, `יובאו ${n} תדלוקים.`),
    importAnalyze: p("Analyze file", "ניתוח הקובץ"),
    importConfirm: p("Import rows", "ייבוא השורות"),
    importClearPreview: p("Clear preview", "ניקוי התצוגה"),
    importPreviewTitle: p("Preview", "תצוגה מקדימה"),
    importValidRowsTemplate: p(
      "{count} row(s) ready to import.",
      "{count} שורות מוכנות לייבוא.",
    ),
    importRowIssuesTitle: p("Row issues (fix the file and analyze again)", "בעיות בשורות (תקנו את הקובץ ונתחו שוב)"),
    importFatalTitle: p("Cannot read file", "לא ניתן לקרוא את הקובץ"),
    importSheetLabel: p("Sheet", "גיליון"),
    importSheetPickHint: p("This workbook has multiple sheets — pick one before analyzing.", "לקובץ יש כמה גיליונות — בחרו גיליון לפני הניתוח."),
    importWorkingAnalyze: p("Analyzing…", "מנתח…"),
    importWorkingCommit: p("Importing…", "מייבא…"),
    importSampleNote: p("Showing up to 40 sample rows.", "מוצגות עד 40 שורות לדוגמה."),
    importCommitBlocked: p("Fix all row issues before importing.", "תקנו את כל בעיות השורות לפני הייבוא."),
    importDoneNavigate: p("Opening petrol…", "פותח תדלוק…"),
    importColumnLitres: p("Litres", "ליטרים"),
  };
}

export function privateClinicSettings(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    pageTitle: p("Settings", "הגדרות"),
    pageIntro: p(
      "Configure treatment note titles, consultation / meeting types, and clinic expense categories. Which links appear in the Clinic navigation bar is set by the platform super admin, not here.",
      "הגדירו כותרות להערות טיפול, סוגי ייעוץ / פגישה וקטגוריות הוצאות לקליניקה. אילו קישורים מופיעים בשורת הניווט של הקליניקה נקבעים על ידי מנהל העל של המערכת — לא כאן.",
    ),
    noteLabelsTitle: p("Treatment note labels", "כותרות להערות טיפול"),
    noteLabelsHelp: p(
      "Configure each note field title and whether it is shown on the treatment form.",
      "הגדירו לכל שדה הערה את הכותרת והאם הוא מוצג בטופס הטיפול.",
    ),
    saveLabels: p("Save labels", "שמירת כותרות"),
    note1Default: p("Note 1", "הערה 1"),
    note2Default: p("Note 2", "הערה 2"),
    note3Default: p("Note 3", "הערה 3"),
    noteFieldEnglish: (n: 1 | 2 | 3) =>
      p(`Note ${n} — English`, `הערה ${n} — אנגלית`),
    noteFieldHebrew: (n: 1 | 2 | 3) =>
      p(`Note ${n} — Hebrew (optional)`, `הערה ${n} — עברית (אופציונלי)`),
    noteFieldVisible: (n: 1 | 2 | 3) =>
      p(`Show Note ${n} on treatment form`, `הצגת הערה ${n} בטופס הטיפול`),
    noteFieldPlaceholder: (n: 1 | 2 | 3) =>
      p(`Note ${n} label`, `כותרת להערה ${n}`),
    consultTypesTitle: p("Consultation / meeting types", "סוגי ייעוץ / פגישה"),
    consultTypesHelp: p(
      "Used when logging meetings on the Consultations page (separate from visit types on sessions). The English label is shown as entered when the interface language is English.",
      "משמש ברישום פגישות בעמוד ייעוצים (נפרד מסוגי ביקור במפגשים). התווית באנגלית מוצגת כפי שהוזנה כששפת הממשק היא אנגלית.",
    ),
    defaultTag: p("(default)", "(ברירת מחדל)"),
    remove: p("Remove", "הסרה"),
    add: p("Add", "הוספה"),
    newTypeName: p("New type name", "שם סוג חדש"),
    expenseCatsTitle: p("Expense categories", "קטגוריות הוצאה"),
    expenseCatsHelp: p(
      "English labels are shown as entered when the interface language is English; Hebrew when it is Hebrew.",
      "תוויות באנגלית מוצגות כפי שהוזנו כששפת הממשק היא אנגלית; בעברית כששפת הממשק היא עברית.",
    ),
    fieldEnglish: p("English", "אנגלית"),
    fieldHebrew: p("Hebrew", "עברית"),
    addConsultationTypeBtn: p("Add type", "הוספת סוג"),
    addExpenseCategoryBtn: p("Add category", "הוספת קטגוריה"),
    newCatName: p("New category name", "שם קטגוריה חדשה"),
    savedConsultType: p("Consultation type saved.", "סוג הייעוץ נשמר."),
    savedConsultTypeRemoved: p("Consultation type removed.", "סוג הייעוץ הוסר."),
    savedConsultTypeArchived: p(
      "Consultation type archived. It is hidden from new consultations; existing records are unchanged.",
      "סוג הייעוץ הועבר לארכיון. הוא לא יופיע בייעוצים חדשים; הרשומות הקיימות נשארות ללא שינוי.",
    ),
    archivedTag: p("(archived)", "(בארכיון)"),
    unsavedTypeChanges: p("Unsaved changes", "יש שינויים שלא נשמרו"),
    savingType: p("Saving…", "שומר…"),
    confirmRemoveConsultType: p(
      "Remove this consultation type? This cannot be undone.",
      "להסיר את סוג הייעוץ? לא ניתן לבטל פעולה זו.",
    ),
    confirmArchiveConsultType: p(
      "This type is used by existing consultations. It will be archived: hidden from new consultations, but kept on past records.",
      "סוג זה בשימוש בייעוצים קיימים. הוא יועבר לארכיון: לא יופיע בייעוצים חדשים, אך יישמר ברשומות קודמות.",
    ),
    savedExpenseCat: p("Expense category saved.", "קטגוריית ההוצאה נשמרה."),
    errCatInUse: p(
      "Cannot delete expense category because it is already used by one or more expenses.",
      "לא ניתן למחוק את קטגוריית ההוצאה כי היא כבר בשימוש.",
    ),
    errGeneric: p("Could not complete the action.", "לא ניתן להשלים את הפעולה."),
    googleCalendarTitle: p("Google Calendar", "Google Calendar"),
    googleCalendarIntro: p(
      "Enable one-way sync so appointment create, reschedule, and cancel actions update your Google Calendar.",
      "הפעילו סנכרון חד־כיווני כדי שיצירה, שינוי מועד וביטול תורים יעדכנו את Google Calendar.",
    ),
    googleConnectFirst: p(
      "Connect your Google account first. The integration toggle is disabled until a Google account is connected.",
      "חברו תחילה את חשבון Google. מתג האינטגרציה מושבת עד לחיבור חשבון Google.",
    ),
    googleCalendarEnabled: p("Enable Google Calendar integration", "הפעלת אינטגרציית Google Calendar"),
    gmailAddress: p("Gmail address", "כתובת Gmail"),
    saveGoogleSettings: p("Save Google settings", "שמירת הגדרות Google"),
    googleConnectedSuccess: p("Google account connected successfully.", "חשבון Google חובר בהצלחה."),
    googleSettingsSaved: p("Google Calendar settings saved.", "הגדרות Google Calendar נשמרו."),
    googleAccountConnected: p("Google account connected.", "חשבון Google מחובר."),
    googleAccountNotConnected: p("Google account not connected yet.", "חשבון Google עדיין לא מחובר."),
    connectGoogleAccount: p("Connect Google account", "חיבור חשבון Google"),
    reconnectGoogleAccount: p("Reconnect Google account", "חיבור מחדש לחשבון Google"),
    gmailChangedReconnect: p(
      "Gmail changed. Reconnect to apply it for calendar sync.",
      "כתובת Gmail השתנתה. חברו מחדש כדי להחיל אותה לסנכרון היומן.",
    ),
    gmailPlaceholder: p("name@gmail.com", "name@gmail.com"),
    digestEmailTitle: p("Clinic digest email", "אימייל סיכום קליניקה"),
    digestIntro: p(
      "Receive a scheduled email with your upcoming clinic appointments and visit schedule. Uses the same outbound email setup as other household digests (Resend).",
      "קבלו אימייל מתוזמן עם תורים קרובים ולוח ביקורים לפי תדירות. משתמש באותה תצורת שליחה כמו תזכורות אחרות במשקה (Resend).",
    ),
    digestEnable: p("Enable clinic digest email", "הפעלת אימייל סיכום קליניקה"),
    digestSectionAppointments: p("Scheduled appointments", "תורים מתוזמנים"),
    digestDaysAheadAppointments: p("Appointments window (days ahead)", "חלון תורים (ימים קדימה)"),
    digestDaysAheadHelp: p(
      "Only scheduled appointments starting within this many calendar days from today.",
      "רק תורים מתוזמנים שמתחילים בתוך מספר הימים הזה מהיום.",
    ),
    digestNoneAppointments: p("No upcoming appointments in this window.", "אין תורים קרובים בחלון שנבחר."),
    digestNoneVisits: p("No clients with a visit frequency.", "אין לקוחות עם תדירות ביקורים."),
    digestAllClear: p("No appointments or visits to report — all clear for now.", "אין תורים או ביקורים לדיווח — הכול נקי לעת עתה."),
    digestOpenAppointments: p("Open appointments", "פתיחת תורים"),
    digestOpenUpcomingVisits: p("Open upcoming visits", "פתיחת ביקורים קרובים"),
    digestSaved: p("Clinic digest settings saved.", "הגדרות אימייל הקליניקה נשמרו."),
    digestDisabled: p("Clinic digest email turned off.", "אימייל סיכום הקליניקה כובה."),
    digestTestOk: p("Test email sent.", "אימייל בדיקה נשלח."),
    digestTestFail: p("Test send failed.", "שליחת הבדיקה נכשלה."),
    digestTestNoSub: p("Save settings before sending a test.", "שמרו הגדרות לפני שליחת בדיקה."),
    digestRecentDeliveries: p("Recent deliveries", "שליחות אחרונות"),
    digestLastScheduled: p("Last scheduled send:", "שליחה מתוזמנת אחרונה:"),
    digestNoHistory: p("No delivery history yet.", "אין היסטוריית שליחה."),
    digestSendTest: p("Send test email now", "שלח אימייל בדיקה עכשיו"),
    digestTurnOff: p("Turn off digest", "כיבוי סיכום"),
    digestRecipient: p("Recipient email (blank = your user email)", "כתובת נמען (ריק = מייל המשתמש)"),
    digestItems: p("items", "פריטים"),
    digestTest: p("Test", "בדיקה"),
    digestScheduled: p("Scheduled", "מתוזמן"),
    morningTitle: p("Morning (Green Invoice)", "Morning (חשבונית ירוקה)"),
    morningIntro: p(
      "Connect your Morning business account to issue receipts automatically when saving a new receipt.",
      "חברו את חשבון העסק ב-Morning כדי להפיק קבלות אוטומטית בעת שמירת קבלה חדשה.",
    ),
    morningJob: p("Clinic job", "משרת קליניקה"),
    morningEnvironment: p("Environment", "סביבה"),
    morningSandbox: p("Sandbox", "בדיקות (Sandbox)"),
    morningProduction: p("Production", "ייצור"),
    morningEnabled: p("Enable Morning integration for this job", "הפעלת אינטגרציית Morning למשרה זו"),
    morningApiKeyId: p("API Key ID", "מזהה מפתח API"),
    morningApiSecret: p("API Secret", "סוד API"),
    morningApiSecretPlaceholder: p("Leave blank to keep existing secret", "השאירו ריק כדי לשמור על הסוד הקיים"),
    morningSave: p("Save Morning settings", "שמירת הגדרות Morning"),
    morningTest: p("Test connection", "בדיקת חיבור"),
    morningDisconnect: p("Disconnect", "ניתוק"),
    morningConnected: p("Connected to Morning", "מחובר ל-Morning"),
    morningNotConnected: p("Not connected", "לא מחובר"),
    morningBusinessName: p("Business name", "שם העסק"),
    morningBusinessTaxId: p("Tax ID", "מספר עוסק"),
    morningDocumentType: p("Document type", "סוג מסמך"),
    morningLastError: p("Last error", "שגיאה אחרונה"),
    morningLastTested: p("Last tested", "נבדק לאחרונה"),
    morningSaved: p("Morning settings saved.", "הגדרות Morning נשמרו."),
    morningTestOk: p("Connection successful.", "החיבור הצליח."),
    morningDisconnected: p("Morning disconnected.", "החיבור ל-Morning נותק."),
    morningErrMissingCredentials: p("API Key ID and Secret are required.", "נדרשים מזהה מפתח API וסוד."),
    morningErrJob: p("Invalid clinic job.", "משרת קליניקה לא תקינה."),
    morningGuideTitle: p("Setup guide", "מדריך הגדרה"),
    morningGuideIntro: p(
      "Follow these steps to connect Morning for automatic receipt (קבלה) issuance. Credentials are stored per clinic job (business), not per user.",
      "עקבו אחר השלבים לחיבור Morning להפקת קבלות אוטומטית. פרטי הגישה נשמרים לפי משרת קליניקה (עסק), לא לפי משתמש.",
    ),
    morningGuideStep1: p(
      "Create or sign in to a Morning account at greeninvoice.co.il. For first-time setup, use Sandbox (בדיקות) before Production.",
      "צרו או התחברו לחשבון Morning ב-greeninvoice.co.il. בהתחלה מומלץ להשתמש בסביבת Sandbox (בדיקות) לפני ייצור.",
    ),
    morningGuideStep2: p(
      "In Morning: My account → Developer tools → API Keys → Add key. Copy the API Key ID and Secret for the matching environment (Sandbox or Production).",
      "ב-Morning: המשתמש שלי → כלי מפתחים → API Keys → הוספת מפתח. העתיקו את מזהה המפתח והסוד לסביבה המתאימה (Sandbox או ייצור).",
    ),
    morningGuideStep3: p(
      "Select the clinic job below. Each private-clinic job can have its own Morning business connection.",
      "בחרו את משרת הקליניקה למטה. לכל משרת קליניקה יכול להיות חיבור Morning נפרד.",
    ),
    morningGuideStep4: p(
      "Choose Sandbox or Production to match where you created the API key, then paste the Key ID and Secret.",
      "בחרו Sandbox או ייצור בהתאם למקום שבו יצרתם את המפתח, והדביקו את מזהה המפתח והסוד.",
    ),
    morningGuideStep5: p(
      "Click Save settings, then Test connection. A successful test shows your business name and tax ID.",
      "לחצו שמירת הגדרות, ואז בדיקת חיבור. בדיקה מוצלחת מציגה את שם העסק ומספר העוסק.",
    ),
    morningGuideStep6: p(
      "Enable the integration and save again. New receipts for this job will issue a קבלה (type 400) via Morning and store the PDF automatically.",
      "סמנו הפעלת האינטגרציה ושמרו שוב. קבלות חדשות למשרה זו יופקו כקבלה (סוג 400) ב-Morning וה-PDF יישמר אוטומטית.",
    ),
    morningGuideDocsLink: p("Morning API documentation", "תיעוד API של Morning"),
    morningTestHint: p(
      "Tests the credentials in the form above (or saved credentials if fields are left blank). Saves credentials automatically when the test succeeds.",
      "בודק את הפרטים בטופס למעלה (או את הפרטים השמורים אם השדות ריקים). שומר את הפרטים אוטומטית כשהבדיקה מצליחה.",
    ),
    morningTestRequiresCredentials: p(
      "Enter API Key ID and Secret (or save them first) to test.",
      "הזינו מזהה מפתח וסוד (או שמרו קודם) כדי לבדוק.",
    ),
    morningReceiptNumberingMode: p("Receipt numbering", "מספור קבלות"),
    morningReceiptNumberingManual: p("Manual only", "ידני בלבד"),
    morningReceiptNumberingAuto: p("Always issue via Morning", "תמיד הפקה ב-Morning"),
    morningReceiptNumberingAsk: p("Ask each time", "שאל בכל פעם"),
    morningReceiptNumberingHint: p(
      "Controls how receipt numbers are assigned when creating receipts for this job.",
      "קובע כיצד מוקצים מספרי קבלות בעת יצירת קבלות למשרה זו.",
    ),
  };
}

export function privateClinicClinicInsurance(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    title: p("Clinic insurance", "ביטוח קליניקה"),
    blurb: p(
      "Professional liability and clinic premises coverage: provider, contacts, website, annual premium, and renewal date. Stored with your household insurance policies.",
      "ביטוח אחריות מקצועית ונכס הקליניקה: ספק, יצירת קשר, אתר, פרמיה שנתית ותאריך חידוש. נשמר יחד עם פוליסות הביטוח של המשקה.",
    ),
    allHouseholdPolicies: p("All household insurance policies →", "כל פוליסות הביטוח של המשקה ←"),
    urlsUpdated: p("Links updated.", "הקישורים עודכנו."),
    created: p("Policy added.", "הפוליסה נוספה."),
    updated: p("Updated.", "עודכן."),
    addTitle: p("Add policy", "הוספת פוליסה"),
    policyType: p("Policy type", "סוג פוליסה"),
    policyHolderOptional: p("Policy holder (optional)", "בעל פוליסה (אופציונלי)"),
    notSet: p("Not set", "לא הוגדר"),
    provider: p("Provider", "ספק"),
    insuranceCompany: p("Insurance company", "חברת ביטוח"),
    policyName: p("Policy name", "שם הפוליסה"),
    policyNumber: p("Policy number", "מספר פוליסה"),
    contactPhone: p("Contact phone", "טלפון"),
    contactEmail: p("Contact email", "אימייל"),
    website: p("Website", "אתר"),
    notes: p("Notes", "הערות"),
    startDate: p("Policy start", "תאריך התחלה"),
    renewalDate: p("Renewal date", "תאריך חידוש"),
    annualPremium: p("Annual premium", "פרמיה שנתית"),
    currency: p("Currency", "מטבע"),
    addPolicy: p("Add policy", "הוספת פוליסה"),
    listTitle: p("Your clinic policies", "פוליסות הקליניקה"),
    empty: p("No clinic policies yet. Add one above.", "אין פוליסות קליניקה. הוסיפו למעלה."),
    colType: p("Type", "סוג"),
    colProvider: p("Provider", "ספק"),
    colPolicy: p("Policy", "פוליסה"),
    colAnnual: p("Annual premium", "פרמיה שנתית"),
    colRenewal: p("Renewal", "חידוש"),
    colStatus: p("Status", "סטטוס"),
    colActions: p("Actions", "פעולות"),
    edit: p("Edit", "עריכה"),
    statusActive: p("Active", "פעיל"),
    statusInactive: p("Inactive", "לא פעיל"),
    deactivate: p("Deactivate", "השבתה"),
    activate: p("Activate", "הפעלה"),
    editPolicy: p("Edit policy", "עריכת פוליסה"),
    save: p("Save changes", "שמירה"),
    policyDocument: p("Policy document", "קובץ פוליסה"),
    policyDocumentHelp: p(
      "Upload a PDF or image (max 15 MB). Uploading replaces any existing file.",
      "העלאת PDF או תמונה (עד 15MB). העלאה חדשה מחליפה את הקודם.",
    ),
    listEditHint: p(
      "Full edit, links, and policy file: use Edit in the list below.",
      "עריכה מלאה, קישורים וקובץ פוליסה: לחצו «עריכה» ברשימה למטה.",
    ),
  };
}

export function privateClinicWorkSubscriptions(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    title: p("Work subscriptions", "מנויים מקצועיים"),
    blurb: p(
      "Subscriptions linked to a job (e.g. Zoom, annual memberships). Annual fee and renewal apply.",
      "מנויים המקושרים למשרה (למשל זום, חברות שנתיות). תשלום שנתי ותאריך חידוש.",
    ),
    mainSubscriptionsLink: p("All household subscriptions →", "כל המנויים של משק הבית ←"),
    addTitle: p("Add work subscription", "הוספת מנוי מקצועי"),
    listTitle: p("Work-linked subscriptions", "מנויים מקושרים למשרה"),
    empty: p("No work subscriptions yet.", "אין עדיין מנויים מקצועיים."),
    colName: p("Name", "שם"),
    colJob: p("Job", "משרה"),
    colFee: p("Fee", "תשלום"),
    colRenewal: p("Renewal", "חידוש"),
    colWebsite: p("Website", "אתר"),
    open: p("Open", "פתיחה"),
    jobRequired: p("Job", "משרה"),
    selectJob: p("Select job…", "בחירת משרה…"),
    name: p("Name", "שם"),
    description: p("Description (optional)", "תיאור (אופציונלי)"),
    billing: p("Billing", "חיוב"),
    annual: p("Annual", "שנתי"),
    monthly: p("Monthly", "חודשי"),
    monthlyDay: p("Day of month (1–31)", "יום בחודש (1–31)"),
    renewalDate: p("Renewal date (annual)", "תאריך חידוש (שנתי)"),
    feeAmount: p("Fee amount", "סכום"),
    currency: p("Currency", "מטבע"),
    website: p("Website (optional)", "אתר (אופציונלי)"),
    addBtn: p("Add subscription", "הוספת מנוי"),
    errJob: p("Add a job under Clinic → Jobs first.", "הוסיפו משרה תחת קליניקה → משרות תחילה."),
    createdMsg: p("Subscription added.", "המנוי נוסף."),
  };
}

export function privateClinicReminders(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    title: p("Reminders", "תזכורות"),
    blurb: p(
      "Manual reminders are per person profile (your linked profile, or one you choose if your account is not linked). Also shown: upcoming renewals from work subscriptions, active clients with an end date, clinic insurance, and clinic lease end.",
      "תזכורות ידניות שייכות לפרופיל אדם (לפרופיל המקושר, או לבחירה אם החשבון לא מקושר). בנוסף: תאריכי חידוש ממנויים מקצועיים, לקוחות פעילים עם תאריך סיום, ביטוח קליניקה וסיום חוזה שכירות הקליניקה.",
    ),
    addManual: p("Add reminder", "הוספת תזכורת"),
    category: p("Category", "קטגוריה"),
    description: p("Description", "תיאור"),
    reminderDate: p("Reminder date", "תאריך תזכורת"),
    created: p("Created", "נוצר"),
    save: p("Save", "שמירה"),
    deleteBtn: p("Delete", "מחיקה"),
    editManual: p("Edit reminder", "עריכת תזכורת"),
    empty: p("No reminders in this window.", "אין תזכורות בטווח זה."),
    sourceManual: p("Manual", "ידני"),
    sourceSubscription: p("Subscription", "מנוי"),
    sourceClient: p("Client end", "סיום לקוח"),
    sourceInsurance: p("Clinic insurance", "ביטוח קליניקה"),
    sourceRental: p("Clinic lease", "חוזה קליניקה"),
    openRelated: p("Open", "פתיחה"),
    editRelated: p("Edit", "עריכה"),
    tableSource: p("Source", "מקור"),
    tableDate: p("Date", "תאריך"),
    tableSummary: p("Summary", "תיאור"),
    tableActions: p("Actions", "פעולות"),
    upcomingTitle: p("Upcoming (next 60 days, including overdue)", "קרוב (60 יום, כולל באיחור)"),
    deletedMsg: p("Reminder deleted.", "התזכורת נמחקה."),
    cancelEdit: p("Cancel", "ביטול"),
    familyMember: p("Person", "אדם"),
    familyMemberPlaceholder: p("Select…", "בחרו…"),
    addManualNeedMember: p(
      "Add at least one person in the household before creating manual reminders.",
      "יש להוסיף לפחות אדם אחד בבית לפני יצירת תזכורות ידניות.",
    ),
  };
}

export function privateClinicGettingStarted(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    pageTitle: p("User Guide", "מדריך למשתמש"),
    welcomeTitle: p("Welcome to the Clinic", "ברוכים הבאים לקליניקה"),
    welcomeBody: p(
      "This short guide shows how to set up your work and your clients, and how the main workflows fit together. You can open it any time from **More → User Guide**.",
      "מדריך קצר שמסביר איך להגדיר את המשרה והלקוחות, ואיך זרימות העבודה מתחברות. אפשר לחזור לכאן בכל עת דרך **עוד ← מדריך למשתמש**.",
    ),
    step1Lead: p("To get started, define your", "כדי להתחיל, הגדירו את"),
    step1JobsLink: p("Job(s)", "משרה/ות"),
    step1After: p(
      "— the employment context the clinic module uses (for example your private practice role).",
      "— ההקשר המקצועי שמולו מנוהלת הקליניקה (למשל תפקיד הפרקטיקה).",
    ),
    step2: p(
      "If you have more than one program for a job, define them under **Programs** (for example different service lines or price rules).",
      "אם יש לכם יותר מתוכנית אחת למשרה, הגדירו אותן תחת **תוכניות** (למשל קווי שירות או תמחור שונים).",
    ),
    step3: p(
      "Then add your **Clients** so you can schedule visits and record treatments.",
      "לאחר מכן הוסיפו **לקוחות** כדי לקבוע מפגשים ולרשום טיפולים.",
    ),
    step4: p(
      "**Treatments** — Log each session and attach files. Audio attachments can be transcribed (English/Hebrew), which is useful between back-to-back clients: quickly record a spoken summary while details are fresh, then review the transcript before using it in clinical notes.",
      "**טיפולים** — תעדו כל מפגש וצרפו קבצים. ניתן לתמלל קבצי אודיו (אנגלית/עברית), וזה שימושי בין לקוחות רצופים: הקלטת סיכום קצר כשהפרטים טריים, ואז מעבר על התמליל לפני שימוש בהערות טיפול.",
    ),
    uiLanguageBody: p(
      "The Clinic interface is available in **English** and **Hebrew** (change language from user preferences).",
      "ממשק הקליניקה זמין ב**אנגלית** וב**עברית** (שינוי שפה דרך העדפות המשתמש).",
    ),
    twoWaysTitle: p("Two ways to work (you can combine them)", "שתי דרכי עבודה (אפשר לשלב)"),
    wayAppointments: p(
      "**Appointments** — Schedule a session for a specific date and time. After it happens, record the treatment and session details.",
      "**תורים** — קביעת מפגש לתאריך ושעה. לאחר הביקור, רישום הטיפול ופרטי המפגש.",
    ),
    wayCadence: p(
      "**Planned cadence** — Set a treatment schedule for a client (for example once a week). After each visit, the next expected date appears on **Upcoming visits**.",
      "**קצב מתוכנן** — הגדרת לוח טיפולים ללקוח (למשל פעם בשבוע). לאחר כל ביקור, התאריך הבא הצפוי מופיע תחת **ביקורים קרובים**.",
    ),
    googleTitle: p("Google Calendar (optional)", "Google Calendar (אופציונלי)"),
    googleBody: p(
      "Appointments can be pushed to your Google Calendar (**one-way**: from this app to Google). When you schedule an appointment you can add it to your calendar; when you **reschedule** or **cancel**, the change is sent to Google as well. Connect and enable the integration under Clinic **Settings**.",
      "אפשר לדחוף תורים ל־Google Calendar (**חד־כיווני**: מהאפליקציה ל־Google). בעת קביעת תור אפשר להוסיף אותו ליומן; בעת **שינוי מועד** או **ביטול**, העדכון נשלח ל־Google. חיבור והפעלה בהגדרות הקליניקה.",
    ),
    advancedSummary: p("Advanced topics", "נושאים מתקדמים"),
    advCalendar: p(
      "**Calendar sync** — Same as above: connect Gmail/Google under **Settings**, then appointment creates/updates sync outward.",
      "**סנכרון יומן** — כנ״ל: חיבור Gmail/Google תחת **הגדרות**, ואז יצירה/עדכון תורים נדחף החוצה.",
    ),
    advData: p(
      "**Import / Export** — Download a full clinic workbook or import structured spreadsheets (for analysis or migration).",
      "**יבוא / ייצוא** — הורדת חוברת קליניקה מלאה או ייבוא גיליונות מובנים (לניתוח או מעבר מערכת).",
    ),
    advBulkImport: p(
      "**Bulk migration import** — You can import **treatments** and/or **receipts** in bulk when migrating to the system. Use the import flows to review and validate data before finalizing.",
      "**ייבוא מרוכז למעבר מערכת** — אפשר לייבא **טיפולים** ו/או **קבלות** בכמות גדולה בעת מעבר למערכת. מומלץ להשתמש בזרימות הייבוא כדי לבדוק ולאמת נתונים לפני אישור סופי.",
    ),
    advOps: p(
      "**Reports**, **Reminders**, **Consultations**, **Travel**, **Petrol**, **Clinic insurance**, **Work subscriptions** — Use these areas as your practice grows for reporting, reminders, non-session services, mileage and vehicle costs, and professional overheads.",
      "**דוחות**, **תזכורות**, **ייעוצים**, **נסיעות**, **דלק**, **ביטוח קליניקה**, **מנויים מקצועיים** — לשימוש ככל שהפרקטיקה גדלה — דיווח, תזכורות, שירותים מחוץ למפגש, נסיעות ורכב, והוצאות מקצועיות.",
    ),
    advReceiptsTreatments: p(
      "**Receipts linkage (treatments / consultations / travel)** — Treatments represent clinical work; receipts represent collected payments. In **New receipt**, you can enable auto-link when period totals match gross. After save, review/edit links in the same receipt screen (with Select all / Deselect all / Select suggested), and use **T / C / TR** counters to jump to filtered lists.",
      "**שיוך קבלות (טיפולים / ייעוצים / נסיעות)** — טיפולים מייצגים עבודה קלינית; קבלות מייצגות גבייה בפועל. ב**קבלה חדשה** ניתן להפעיל שיוך אוטומטי כשהסכומים בתקופה תואמים לברוטו. לאחר השמירה ממשיכים באותו מסך לקישור/עריכה (בחירת הכל / ניקוי בחירה / בחירת מוצעים), ובוחרים במונים **T / C / TR** למעבר לרשימות המסוננות.",
    ),
    advDemoPrivacy: p(
      "**Demo privacy mode** — Use **Hide client names & amounts** in the top toolbar when you need to demo the system to others or share screens with the system administrator. It masks client names and monetary amounts during your session to reduce data exposure.",
      "**מצב פרטיות להדגמה** — השתמשו באפשרות **הסתרת שמות לקוחות וסכומים** בסרגל העליון כשצריך להדגים את המערכת לאחרים או לשתף מסך עם מנהל המערכת. האפשרות מטשטשת שמות לקוחות וסכומים במהלך הסשן כדי להפחית חשיפת מידע.",
    ),
    familiesWhenEnabledTitle: p("Families", "משפחות"),
    familiesWhenEnabledBody: p(
      "Use **Families** to group related clients: give the family a name, pick the **job**, optional **start/end** dates, optional **family-level billing** (or leave billing on each client), and **notes**. On **Add family**, you build **everyone on one screen**: use **Add member** to create **new clients** (name, family role, main contact), or **Existing clients** to multi-select people already in your client list—you can mix both before **Save family**. Then use the Families list to edit the group.",
      "ב**משפחות** מאגדים לקוחות קשורים: שם משפחה, **משרה**, **תאריכי התחלה/סיום** אופציונליים, **חיוב ברמת משפחה** (או השארת חיוב בכל לקוח), ו**הערות**. ב**הוספת משפחה** בונים **הכול במסך אחד**: **הוספת חבר משפחה** יוצרת **לקוחות חדשים** (שם, תפקיד במשפחה, איש קשר ראשי), או **לקוחות קיימים** לבחירה מרובה מאלה שכבר במערכת—אפשר לשלב לפני **שמירת משפחה**. לאחר מכן עורכים מהרשימה.",
    ),
    familiesWhenDisabled: p(
      "This product supports an optional **Families** workflow for grouping related clients. It is **not** enabled for your account. To discuss turning it on, contact your **system administrator**.",
      "המערכת תומכת באופציה של **משפחות** לקיבוץ לקוחות קשורים. האופציה **אינה** מופעלת אצלכם. לשיחה על הפעלה, פנו ל**מנהל המערכת**.",
    ),
    jobSavedToast: p("Job saved.", "המשרה נשמרה."),
    moreMenuHint: p(
      "Tip: open this guide again from **More → User Guide**.",
      "טיפ: אפשר לחזור למדריך דרך **עוד ← מדריך למשתמש**.",
    ),
  };
}

export function privateClinicImportExport(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    exportTitle: p("Export", "ייצוא"),
    exportHelp: p(
      "Download one Excel workbook with multiple sheets (jobs, programs, clients, treatments, receipts, expenses, etc.). This export is for analysis/migration and is not a full disaster-recovery backup.",
      "הורדת חוברת Excel עם גליונות מרובים (משרות, תוכניות, לקוחות, טיפולים, קבלות, הוצאות וכו׳). הייצוא מיועד לניתוח/העברה ואינו גיבוי מלא לשחזור מאסון.",
    ),
    downloadXlsx: p("Download .xlsx", "הורדת .xlsx"),
    importTitle: p("Import", "יבוא"),
    importHelp: p(
      "Upload an Excel file in the same shape as the export (sheet names include Programs, Clients, Treatments, Receipts, ConsultationTypes, Consultations, Travel, Expenses, etc.). Existing rows are upserted when id is present. This import is not a full-state restore.",
      "העלאת קובץ Excel באותו מבנה כמו הייצוא (שמות גליונות כוללים Programs, Clients, Treatments וכו׳). רשומות קיימות מתעדכנות כש־id קיים. הייבוא אינו שחזור מלא של מצב המערכת.",
    ),
    importWorkbook: p("Import workbook", "ייבוא חוברת"),
    importFailed: p("Import failed", "הייבוא נכשל"),
    importedRows: (n: number, issues: number, errText: string) =>
      p(
        `Imported ${n} row(s). ${issues ? `${issues} issue(s). ` : ""}${errText}`,
        `יובאו ${n} שורות. ${issues ? `${issues} בעיות. ` : ""}${errText}`,
      ),
  };
}
