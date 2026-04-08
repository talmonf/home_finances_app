import { PRIVATE_CLINIC_NAV_ITEMS, type PrivateClinicNavKey } from "@/lib/private-clinic-nav";
import type { TherapyPaymentStatus } from "@/lib/therapy/payment";
import type { UiLanguage } from "@/lib/ui-language";

const NAV_LABELS_HE: Record<PrivateClinicNavKey, string> = {
  overview: "סקירה",
  jobs: "משרות",
  programs: "תוכניות",
  clients: "לקוחות",
  treatments: "טיפולים",
  receipts: "קבלות",
  expenses: "הוצאות",
  appointments: "תורים",
  consultations: "ייעוצים",
  travel: "נסיעות",
  petrol: "דלק",
  settings: "הגדרות",
  importExport: "יבוא / ייצוא",
};

/** Bilingual helper for Private clinic UI */
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
      title: "קליניקה פרטית",
      description:
        "ניהול לקוחות, מפגשים, קבלות והוצאות קליניקה לפי משרת עבודה.",
      navAriaLabel: "אזורים בקליניקה הפרטית",
    };
  }
  return {
    backToDashboard: "← Back to dashboard",
    title: "Private clinic",
    description: "Manage clients, sessions, receipts, and clinic expenses per employment job.",
    navAriaLabel: "Private clinic sections",
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
    employmentType: p("Employment type", "סוג העסקה"),
    jobTitle: p("Job title", "תפקיד"),
    employerOptional: p("Employer (optional)", "מעסיק (אופציונלי)"),
    employerTaxOptional: p("Employer tax number (optional)", "מספר עוסק מעסיק (אופציונלי)"),
    employerAddressOptional: p("Employer address (optional)", "כתובת מעסיק (אופציונלי)"),
    saveJob: c.save,
  };
}

export function privateClinicPrograms(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    addProgramTitle: p("Add program", "הוספת תכנית"),
    addProgramBtn: p("Add program", "הוספת תכנית"),
    programsHeading: p("Programs", "תוכניות"),
    programName: p("Program name", "שם תכנית"),
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
    addClientTitle: p("Add client", "הוספת לקוח"),
    addClientBtn: p("Add client", "הוספת לקוח"),
    clientsHeading: p("Clients", "לקוחות"),
    firstName: p("First name", "שם פרטי"),
    lastNameOptional: p("Last name (optional)", "שם משפחה (אופציונלי)"),
    idOptional: p("ID (optional)", "ת״ז (אופציונלי)"),
    email: p("Email", "דוא״ל"),
    mobilePhone: p("Mobile phone", "טלפון נייד"),
    homePhone: p("Home phone", "טלפון בית"),
    address: p("Address", "כתובת"),
    saveClient: p("Save client", "שמירת לקוח"),
    defaultJob: p("Default job", "משרה ברירת מחדל"),
    defaultProgramOptional: p("Default program (optional)", "תכנית ברירת מחדל (אופציונלי)"),
    selectJob: p("Select job", "בחרו משרה"),
    alsoSeenUnder: p(
      "Also seen under these jobs (includes default)",
      "מופיע גם תחת המשרות הבאות (כולל ברירת המחדל)",
    ),
  };
}

export function privateClinicTreatments(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    filters: p("Filters", "סינון"),
    payment: p("Payment", "תשלום"),
    filterAll: c.all,
    filterPaid: p("Paid", "שולם"),
    filterPartial: p("Partial", "חלקי"),
    filterUnpaid: p("Unpaid", "לא שולם"),
    logTreatment: p("Log treatment", "רישום טיפול"),
    dateTime: c.dateTime,
    visitType: p("Visit type", "סוג ביקור"),
    saveTreatment: p("Save treatment", "שמירת טיפול"),
    treatmentsCount: (n: number) => p(`Treatments (${n})`, `טיפולים (${n})`),
    clinicIncomeLink: p("Link bank transaction — clinic income", "קישור לתנועת בנק — הכנסה מהקליניקה"),
    clinicIncomeHint: p(
      "Optional: link a credit/incoming payment that matches this session fee.",
      "אופציונלי: קישור לזכות/הכנסה שמתאימה לעלות המפגש.",
    ),
  };
}

export function privateClinicReceipts(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  const c = privateClinicCommon(lang);
  return {
    newReceipt: p("New receipt", "קבלה חדשה"),
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
    receiptsHeading: p("Receipts", "קבלות"),
    tableNumber: p("#", "מס׳"),
    tableDate: c.date,
    tableJob: c.job,
    tableAmount: c.amount,
    tableView: p("View", "צפייה"),
    open: p("Open", "פתיחה"),
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
    upcoming: p("Upcoming", "קרובים"),
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
    tabsTitle: p("Private clinic tabs", "לשוניות קליניקה פרטית"),
    tabsHelp: p(
      "Choose which sections appear in the Private clinic navigation. You can still open a hidden tab if you know the URL.",
      "בחרו אילו אזורים יופיעו בניווט הקליניקה. עדיין אפשר לפתוח לשונית מוסתרת אם מכירים את הכתובת.",
    ),
    saveTabVisibility: p("Save tab visibility", "שמירת נראות לשוניות"),
    tabSaved: p("Tab visibility saved.", "נראות הלשוניות נשמרה."),
    noteLabelsTitle: p("Treatment note labels", "כותרות להערות טיפול"),
    noteLabelsHelp: p(
      "These titles appear next to the three note fields when logging treatments.",
      "כותרות אלה מופיעות ליד שלושת שדות ההערות ברישום טיפולים.",
    ),
    saveLabels: p("Save labels", "שמירת כותרות"),
    note1Default: p("Note 1", "הערה 1"),
    note2Default: p("Note 2", "הערה 2"),
    note3Default: p("Note 3", "הערה 3"),
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
    newCatName: p("New category name", "שם קטגוריה חדשה"),
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

export function privateClinicImportExport(lang: UiLanguage) {
  const p = (en: string, he: string) => pc(lang, en, he);
  return {
    exportTitle: p("Export", "ייצוא"),
    exportHelp: p(
      "Download one Excel workbook with multiple sheets (jobs, programs, clients, treatments, receipts, expenses, etc.).",
      "הורדת חוברת Excel עם גליונות מרובים (משרות, תוכניות, לקוחות, טיפולים, קבלות, הוצאות וכו׳).",
    ),
    downloadXlsx: p("Download .xlsx", "הורדת .xlsx"),
    importTitle: p("Import", "יבוא"),
    importHelp: p(
      "Upload an Excel file in the same shape as the export (sheet names include Programs, Clients, Treatments, Receipts, ConsultationTypes, Consultations, Travel, Expenses, etc.). Existing rows are upserted when id is present.",
      "העלאת קובץ Excel באותו מבנה כמו הייצוא (שמות גליונות כוללים Programs, Clients, Treatments וכו׳). רשומות קיימות מתעדכנות כש־id קיים.",
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
