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
        "ניהול לקוחות, מפגשים, קבלות והוצאות קליניקה לפי משרת עבודה.",
      navAriaLabel: "אזורים בקליניקה",
    };
  }
  return {
    backToDashboard: "← Back to dashboard",
    title: "Clinic",
    description: "Manage clients, sessions, receipts, and clinic expenses per employment job.",
    navAriaLabel: "Clinic sections",
  };
}

export type PrivateClinicOverviewStatId =
  | "activeClients"
  | "treatments"
  | "receipts"
  | "expenses"
  | "appointments"
  | "consultations"
  | "travel";

export function privateClinicOverviewCardLabel(id: PrivateClinicOverviewStatId, lang: UiLanguage): string {
  if (lang === "he") {
    const he: Record<PrivateClinicOverviewStatId, string> = {
      activeClients: "לקוחות פעילים",
      treatments: "טיפולים (מאז ומתמיד)",
      receipts: "קבלות",
      expenses: "הוצאות קליניקה",
      appointments: "תורים קרובים",
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
    consultations: "Consultations logged",
    travel: "Travel entries",
  };
  return en[id];
}

export function privateClinicCommon(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    saved: p("Saved.", "נשמר."),
    deleted: p("Record removed.", "הרשומה הוסרה."),
    fillUpSaved: p("Fill-up saved.", "תדלוק נשמר."),
    noFamilyMemberBanner: p(
      "Your user is not linked to a family member. Link the user to a family member to manage clients.",
      "המשתמש שלך לא משויך לבן משפחה. יש לשייך משתמש לבן משפחה כדי לנהל לקוחות.",
    ),
    noFamilyMemberJobs: p(
      "Your user is not linked to a family member yet. Link the user to a family member to manage clinic jobs.",
      "המשתמש שלך עדיין לא משויך לבן משפחה. יש לשייך משתמש לבן משפחה כדי לנהל משרות קליניקה.",
    ),
    saveFailedGeneric: p(
      "Could not save job. Please review the fields and try again.",
      "לא ניתן לשמור את המשרה. בדקו את השדות ונסו שוב.",
    ),
    noJobsForMember: p("No jobs yet for your linked family member.", "אין עדיין משרות לבן המשפחה המשויך."),
    active: p("Active", "פעיל"),
    inactive: p("Inactive", "לא פעיל"),
    present: p("Present", "נוכחי"),
    notes: p("Notes", "הערות"),
    save: p("Save", "שמירה"),
    delete: p("Delete", "מחיקה"),
    edit: p("Edit", "עריכה"),
    cancel: p("Cancel", "ביטול"),
    add: p("Add", "הוספה"),
    yes: p("Yes", "כן"),
    no: p("No", "לא"),
    none: p("None", "ללא"),
    job: p("Job", "משרה"),
    program: p("Program", "תכנית"),
    client: p("Client", "לקוח"),
    category: p("Category", "קטגוריה"),
    amount: p("Amount", "סכום"),
    currency: p("Currency", "מטבע"),
    type: p("Type", "סוג"),
    status: p("Status", "סטטוס"),
    name: p("Name", "שם"),
    date: p("Date", "תאריך"),
    dateTime: p("Date & time", "תאריך ושעה"),
    from: p("From", "מ"),
    to: p("To", "עד"),
    apply: p("Apply", "החל"),
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
      "Your user is not linked to a family member, so jobs cannot be loaded.",
      "המשתמש לא משויך לבן משפחה ולכן לא ניתן לטעון משרות.",
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
    addJobTitle: p("Add job", "הוספת עבודה"),
    addJobBtn: p("Add job", "הוספת עבודה"),
    jobsHeading: p("Jobs", "משרות"),
    editJobPageTitle: p("Edit job", "עריכת עבודה"),
    backToJobs: p("Back to jobs", "חזרה לרשימת עבודות"),
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
      "Each job must be tied to someone in your household list (Family members).",
      "כל משרה חייבת להיות משויכת למישהו מרשימת בני המשפחה.",
    ),
    invalidEmployedPerson: p("Choose a valid employed person.", "בחרו עובד/ת תקין/ה."),
    needMemberBeforeJob: p(
      "Add at least one person under Family members before you can add a job.",
      "הוסיפו לפחות בן משפחה אחד לפני הוספת משרה.",
    ),
    privateClinicRole: p("Clinic role", "סיווג לקליניקה"),
    privateClinicRoleHelp: p(
      "On: this job appears in the Clinic module; receipts default to clients and bank matching is lenient. Off: hidden from clinic lists/forms; receipts default to organization and bank matching is strict.",
      "פעיל: המשרה מופיעה במודול הקליניקה; קבלות ברירת מחדל ללקוחות והתאמת חשבון בנק מקלה. כבוי: מוסתרת מרשימות/טפסים של הקליניקה; קבלות ארגוניות והתאמת בנק מחמירה.",
    ),
    clinicUnlinkedHint: p(
      "Your user is not linked to a family member — you can still use Clinic for the whole household. When adding a job, choose which household member holds that employment.",
      "המשתמש לא משויך לבן משפחה — עדיין אפשר להשתמש בקליניקה לכל המשקה. בעת הוספת משרה, בחרו לאיזה בן משפחה המשרה שייכת.",
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
    programName: p("Program name", "שם תכנית"),
    visitFrequency: p("Visit frequency", "תדירות ביקורים"),
    visitFrequencyHint: p(
      "Optional. Used as the default when you add a client with this program selected.",
      "אופציונלי. משמש ברירת מחדל בעת הוספת לקוח עם תכנית זו.",
    ),
    visitsPer: p("Visits per", "ביקורים בכל"),
    weeks: p("week(s)", "שבוע/ות"),
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
    colTreatmentsCount: p("# treatments", "מס׳ טיפולים"),
    colNextVisitDue: p("Next visit due", "ביקור הבא (משוער)"),
    nextVisitNoTreatments: p("No treatments logged", "אין טיפולים רשומים"),
    nextVisitNoFrequency: p("Set visit frequency", "הגדירו תדירות ביקורים"),
    colStart: p("Start", "התחלה"),
    colEnd: p("End", "סיום"),
    colActions: p("Actions", "פעולות"),
    errMissing: p("First name and default job are required.", "נדרשים שם פרטי ומשרת ברירת מחדל."),
    errJob: p("That job is not available for your account.", "המשרה אינה זמינה לחשבון שלך."),
    errProgram: p("Default program must belong to the default job.", "תכנית ברירת המחדל חייבת להשתייך למשרת ברירת המחדל."),
    errVisitType: p("Default visit type is invalid.", "סוג ביקור ברירת המחדל אינו תקין."),
    errNotfound: p("Client not found.", "הלקוח לא נמצא."),
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
    colJob: cl.colJob,
    colProgram: cl.colProgram,
    colActions: cl.colActions,
    overdue: p("Overdue", "באיחור"),
    dueToday: p("Today", "היום"),
    logTreatment: p("Log treatment", "רישום טיפול"),
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
    importBtn: p("Import treatments", "ייבוא טיפולים"),
    importClearPreview: p("Clear preview", "ניקוי תצוגה"),
    importBackToTreatments: p("Back to treatments", "חזרה לטיפולים"),
    importDownloadExample: p("Download example CSV (headers only)", "הורדת קובץ לדוגמה (כותרות בלבד)"),
    importTitle: p("Import treatments workbook", "ייבוא קובץ טיפולים"),
    importInstructions: p(
      "Upload a workbook, review the preview, then confirm to import. You can cancel, fix the file, and analyze again.",
      "העלו קובץ, בדקו את התצוגה המקדימה, ואז אשרו לייבוא. אפשר לבטל, לתקן קובץ ולנתח שוב.",
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
    totalAmount: p("Total amount", "סכום כולל"),
    recipientClient: p("Client", "לקוח"),
    recipientOrg: p("Organization", "ארגון"),
    paymentCash: p("Cash", "מזומן"),
    paymentBank: p("Bank transfer", "העברה בנקאית"),
    paymentDigital: p("Digital card", "כרטיס דיגיטלי"),
    paymentCredit: p("Credit card", "כרטיס אשראי"),
    linkTxPayment: p(
      "Link bank transaction — payment received",
      "קישור לתנועת בנק — תשלום שהתקבל",
    ),
    linkTxPaymentHint: p(
      "Optional: incoming payment that matches this receipt.",
      "אופציונלי: תשלום נכנס שמתאים לקבלה זו.",
    ),
    createAllocate: p("Create & allocate", "יצירה ושיוך"),
    linkTreatmentsHeading: p("Link treatments to this receipt", "שיוך טיפולים לקבלה זו"),
    linkTreatmentsSubmit: p("Link selected treatments", "שיוך טיפולים נבחרים"),
    unlinkFromReceipt: p("Unlink", "נתק"),
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
      "Upload a spreadsheet with: Payment Date, Client, Amount, Receipt #, Notes, Payment method. Optional columns treatmentDate01, treatmentDate02, … set each session’s treatment date (otherwise the payment date is used). If several treatment dates are filled on one row, the amount is split evenly across those sessions. Enter your usual session fee; if a row amount is at most 10% above that fee (or lower), treatments are created and linked. Larger amounts import the receipt only — create treatments manually afterward.",
      "העלו גיליון עם: תאריך תשלום, לקוח, סכום, מספר קבלה, הערות, אמצעי תשלום. עמודות אופציונליות treatmentDate01, treatmentDate02, … מגדירות את תאריך כל טיפול (אחרת משתמשים בתאריך התשלום). אם ממלאים כמה תאריכי טיפול באותה שורה, הסכום מתחלק שווה בין המפגשים. הזינו את דמי הסשן המקובלים; אם סכום השורה לכל היותר 10% מעל העלות (או נמוך יותר), ייווצרו טיפולים ויקושרו. סכומים גבוהים יותר יייבאו קבלה בלבד — יש ליצור טיפולים ידנית.",
    ),
    usualTreatmentCostLabel: p("Usual treatment cost (per session)", "עלות טיפול מקובלת (למפגש)"),
    usualTreatmentCostHint: p(
      "Compared to each receipt amount: auto-create one treatment when amount ≤ this × 110%.",
      "מושווה לסכום כל קבלה: ייווצר טיפול אוטומטית כאשר הסכום ≤ ערך זה × 110%.",
    ),
    saveUsualTreatmentCostDefault: p("Save as household default for next time", "שמירה כברירת מחדל לבית"),
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
      "Log meetings and consultations: expected income, costs, type, and job. Manage custom types under Settings. Link bank lines separately for money in vs money out.",
      "רישום פגישות וייעוצים: הכנסה צפויה, עלויות, סוג ומשרה. ניהול סוגים מותאמים תחת הגדרות. קישור תנועות בנק בנפרד להכנסה מול הוצאה.",
    ),
    addTitle: p("Add consultation / meeting", "הוספת ייעוץ / פגישה"),
    incomeLabel: p("Amount to receive (income)", "סכום לקבלה (הכנסה)"),
    costLabel: p("Amount it cost you", "סכום שעלה לכם"),
    linkIncome: p("Link transaction — clinic income", "קישור לתנועה — הכנסה מהקליניקה"),
    linkIncomeHint: p("Usually a credit (incoming) on your bank statement.", "בדרך כלל זכות (נכנס) בדף חשבון הבנק."),
    linkCost: p("Link transaction — cost / expense", "קישור לתנועה — עלות / הוצאה"),
    linkCostHint: p("Usually a debit (payment) for this meeting.", "בדרך כלל חיוב (תשלום) עבור הפגישה."),
    recent: p("Recent", "אחרונים"),
    filters: p("Filters", "סינון"),
    filterIncomeBank: p("Income in bank", "הכנסה בבנק"),
    incomeBankAll: p("All", "הכל"),
    incomeBankLinked: p("Linked (received)", "מקושר (התקבל)"),
    incomeBankUnlinked: p("Not linked", "לא מקושר"),
    consultationsCount: (n: number) => p(`Consultations (${n})`, `ייעוצים (${n})`),
    incomeTx: p("Income transaction", "תנועת הכנסה"),
    costTx: p("Cost transaction", "תנועת עלות"),
  };
}

export function privateClinicTravel(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    intro: p(
      "Record travel tied to a specific session or to a job in general. Optionally link a bank transaction (typically a debit) for reimbursement or mileage costs.",
      "רישום נסיעה המקושרת למפגש מסוים או למשרה באופן כללי. אופציונלי: קישור לתנועת בנק (בדרך כלל חיוב) להחזר או עלות נסיעה.",
    ),
    addTravel: p("Add travel", "הוספת נסיעה"),
    relatedJob: p("Related to a job", "קשור למשרה"),
    relatedTreatment: p("Related to a treatment session", "קשור למפגש טיפול"),
    jobWhenScope: p('Job (when “related to a job”)', 'משרה (כאשר "קשור למשרה")'),
    treatmentWhenScope: p(
      'Treatment (when “related to a treatment”)',
      'טיפול (כאשר "קשור לטיפול")',
    ),
    costAmountOptional: p("Cost amount (optional)", "סכום עלות (אופציונלי)"),
    notesRoute: p("Notes (route, mileage, parking…)", "הערות (מסלול, ק״מ, חניה…)"),
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
    filterBankLink: p("Bank transaction", "תנועת בנק"),
    bankLinkAll: p("All", "הכל"),
    bankLinkLinked: p("Linked", "מקושר"),
    bankLinkUnlinked: p("Not linked", "לא מקושר"),
    entriesCount: (n: number) => p(`Entries (${n})`, `רשומות (${n})`),
    scopeTreatment: p("Treatment:", "טיפול:"),
    scopeJob: p("Job:", "משרה:"),
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
    upcoming: p("Upcoming appointments", "תורים קרובים"),
    noUpcoming: p("No upcoming appointments.", "אין תורים קרובים."),
    programOptional: p("Program (optional)", "תכנית (אופציונלי)"),
    schedule: p("Schedule", "תזמון"),
    weekly: p("Weekly", "שבועי"),
    biweekly: p("Every 2 weeks", "כל שבועיים"),
    createSeriesGenerate: p("Create series & generate", "יצירת סדרה והפקת תורים"),
    startCol: p("Start", "התחלה"),
    deleteSeries: p("Delete series", "מחיקת סדרה"),
    statusScheduled: p("scheduled", "מתוזמן"),
    statusCancelled: p("cancelled", "בוטל"),
    statusCompleted: p("completed", "הושלם"),
    setStatus: p("Set", "החל"),
    addAppointment: p("Add appointment", "הוספת תור"),
    recurringToggle: p("Recurring appointment", "תור חוזר"),
    actionsCol: p("Actions", "פעולות"),
    cancel: p("Cancel", "ביטול"),
    reschedule: p("Reschedule", "דחייה"),
    edit: p("Edit", "עריכה"),
    cancelConfirm: p(
      "Mark this appointment as cancelled?",
      "לסמן את התור כמבוטל?",
    ),
    backToAppointments: p("Back to appointments", "חזרה לתורים"),
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
    endOptional: p("End (optional)", "סיום (אופציונלי)"),
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
    download: p("Download spreadsheet", "הורדת גיליון"),
    empty: p("No audit entries yet.", "אין רשומות ביקורת עדיין."),
    tableWhen: p("When", "מתי"),
    tableUser: p("User", "משתמש"),
    tableAction: p("Action", "פעולה"),
    tableAppointment: p("Appointment", "תור"),
    tableDetails: p("Details", "פרטים"),
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
      "Family members aged 16 or older on the fill date (requires date of birth). Change the date above to update who appears here.",
      "בני משפחה בני 16 ומעלה בתאריך התדלוק (נדרש תאריך לידה). שינוי התאריך למעלה מעדכן את הרשימה.",
    ),
    tankerNoEligible: p(
      "No one is aged 16+ on this fill date. Pick a different date or add/update dates of birth for family members.",
      "אין מועמד בן 16 ומעלה בתאריך זה. בחרו תאריך אחר או עדכנו תאריכי לידה.",
    ),
    tankerNoDob: p(
      "Add a date of birth for each family member who should appear here. You need at least one person aged 16+ on the fill date to record who tanked up.",
      "הוסיפו תאריך לידה לכל בן משפחה שאמור להופיע. נדרש לפחות אדם אחד בן 16+ בתאריך התדלוק.",
    ),
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
      "These titles appear next to the three note fields when logging treatments.",
      "כותרות אלה מופיעות ליד שלושת שדות ההערות ברישום טיפולים.",
    ),
    saveLabels: p("Save labels", "שמירת כותרות"),
    note1Default: p("Note 1", "הערה 1"),
    note2Default: p("Note 2", "הערה 2"),
    note3Default: p("Note 3", "הערה 3"),
    noteFieldEnglish: (n: 1 | 2 | 3) =>
      p(`Note ${n} — English`, `הערה ${n} — אנגלית`),
    noteFieldHebrew: (n: 1 | 2 | 3) =>
      p(`Note ${n} — Hebrew (optional)`, `הערה ${n} — עברית (אופציונלי)`),
    consultTypesTitle: p("Consultation / meeting types", "סוגי ייעוץ / פגישה"),
    consultTypesHelp: p(
      "Used when logging meetings on the Consultations page (separate from visit types on sessions).",
      "משמש ברישום פגישות בעמוד ייעוצים (נפרד מסוגי ביקור במפגשים).",
    ),
    defaultTag: p("(default)", "(ברירת מחדל)"),
    remove: p("Remove", "הסרה"),
    add: p("Add", "הוספה"),
    newTypeName: p("New type name", "שם סוג חדש"),
    expenseCatsTitle: p("Expense categories", "קטגוריות הוצאה"),
    expenseCatsHelp: p(
      "English names are used in exports; Hebrew is shown when the household interface language is Hebrew.",
      "שמות באנגלית משמשים בייצוא; עברית מוצגת כששפת הממשק של המשקה היא עברית.",
    ),
    fieldEnglish: p("English", "אנגלית"),
    fieldHebrew: p("Hebrew", "עברית"),
    addConsultationTypeBtn: p("Add type", "הוספת סוג"),
    addExpenseCategoryBtn: p("Add category", "הוספת קטגוריה"),
    newCatName: p("New category name", "שם קטגוריה חדשה"),
    savedConsultType: p("Consultation type saved.", "סוג הייעוץ נשמר."),
    savedExpenseCat: p("Expense category saved.", "קטגוריית ההוצאה נשמרה."),
    errCtypeInUse: p(
      "Cannot delete consultation type because it is already used by one or more consultations.",
      "לא ניתן למחוק את סוג הייעוץ כי הוא כבר בשימוש.",
    ),
    errCatInUse: p(
      "Cannot delete expense category because it is already used by one or more expenses.",
      "לא ניתן למחוק את קטגוריית ההוצאה כי היא כבר בשימוש.",
    ),
    errGeneric: p("Could not complete the action.", "לא ניתן להשלים את הפעולה."),
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
    mainSubscriptionsLink: p("All household subscriptions →", "כל המנויים של המשקה ←"),
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
      "Manual reminders are per family member (your linked profile, or one you choose if your account is not linked). Also shown: upcoming renewals from work subscriptions, active clients with an end date, clinic insurance, and clinic lease end.",
      "תזכורות ידניות שייכות לבן/בת משפחה (לפרופיל המקושר, או לבחירה אם החשבון לא מקושר). בנוסף: תאריכי חידוש ממנויים מקצועיים, לקוחות פעילים עם תאריך סיום, ביטוח קליניקה וסיום חוזה שכירות הקליניקה.",
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
    familyMember: p("Family member", "בן/בת משפחה"),
    familyMemberPlaceholder: p("Select…", "בחרו…"),
    addManualNeedMember: p(
      "Add at least one family member in the household before creating manual reminders.",
      "יש להוסיף לפחות בן/בת משפחה בבית לפני יצירת תזכורות ידניות.",
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
